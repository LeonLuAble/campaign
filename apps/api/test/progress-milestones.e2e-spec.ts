import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { DevNotificationSender } from '../src/modules/auth/infrastructure/dev-notification.sender.js';
import {
  clearIdentityData,
  ensureIdentitySchema,
} from './ensure-identity-schema.js';
import {
  auth,
  promotePlatformAdmin,
  registerActivatedUser,
} from './tenant-test-helpers.js';

describe('Progress, achievements and milestones (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let notifications: DevNotificationSender;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);
    await ensureIdentitySchema(dataSource);
    notifications = app.get(DevNotificationSender);
  });

  afterAll(async () => {
    await clearIdentityData(dataSource);
    await app.close();
  });

  beforeEach(async () => {
    await clearIdentityData(dataSource);
    notifications.clear();
  });

  async function assignMemberRole(
    adminToken: string,
    customerId: string,
    membershipId: string,
  ) {
    const roles = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .query({ customerId })
      .set(auth(adminToken));
    const memberRole = roles.body.find(
      (role: { key: string }) => role.key === 'member',
    );
    await request(app.getHttpServer())
      .post(`/api/v1/memberships/${membershipId}/roles`)
      .set(auth(adminToken))
      .send({ roleId: memberRole.id });
  }

  async function startedCampaign(options?: {
    configuration?: Record<string, unknown>;
    withCommunity?: boolean;
  }) {
    const admin = await registerActivatedUser(
      app,
      notifications,
      'admin@example.com',
    );
    await promotePlatformAdmin(dataSource, admin.userId);
    const member = await registerActivatedUser(
      app,
      notifications,
      'member@example.com',
    );
    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(admin.accessToken))
      .send({ name: 'Tzu Chi Malaysia' });
    let parentCommunityId: string | null = null;
    let childCommunityId: string | null = null;
    if (options?.withCommunity) {
      const parent = await request(app.getHttpServer())
        .post('/api/v1/communities')
        .set(auth(admin.accessToken))
        .send({ customerId: customer.body.id, name: 'Region' });
      const child = await request(app.getHttpServer())
        .post('/api/v1/communities')
        .set(auth(admin.accessToken))
        .send({
          customerId: customer.body.id,
          parentId: parent.body.id,
          name: 'Chapter',
        });
      parentCommunityId = parent.body.id as string;
      childCommunityId = child.body.id as string;
      const childMembership = await request(app.getHttpServer())
        .post('/api/v1/memberships')
        .set(auth(admin.accessToken))
        .send({
          customerId: customer.body.id,
          userId: member.userId,
          communityId: childCommunityId,
        });
      await assignMemberRole(
        admin.accessToken,
        customer.body.id,
        childMembership.body.id,
      );
    } else {
      const membership = await request(app.getHttpServer())
        .post('/api/v1/memberships')
        .set(auth(admin.accessToken))
        .send({ customerId: customer.body.id, userId: member.userId });
      await assignMemberRole(
        admin.accessToken,
        customer.body.id,
        membership.body.id,
      );
    }

    const template = await request(app.getHttpServer())
      .post('/api/v1/campaign-templates')
      .set(auth(admin.accessToken))
      .send({ customerId: customer.body.id, name: 'Environmental Action' });
    const scope = await request(app.getHttpServer())
      .post('/api/v1/campaign-scopes')
      .set(auth(admin.accessToken))
      .send({
        customerId: customer.body.id,
        templateId: template.body.id,
        name: 'Vegetarian',
      });
    const campaign = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set(auth(admin.accessToken))
      .send({
        customerId: customer.body.id,
        templateId: template.body.id,
        scopeId: scope.body.id,
        name: '速素数数',
        timezone: 'Asia/Kuala_Lumpur',
        startsOn: '2020-01-01',
        endsOn: '2099-12-31',
        communityIds: childCommunityId ? [childCommunityId] : undefined,
        configuration: options?.configuration ?? {
          rulesStrategy: 'vegetarian',
        },
      });
    const definition = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaign.body.id}/action-definitions`)
      .set(auth(admin.accessToken))
      .send({ key: 'vegetarian_day', name: 'Vegetarian day', unit: 'days' });
    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaign.body.id}/publish`)
      .set(auth(admin.accessToken));
    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaign.body.id}/start`)
      .set(auth(admin.accessToken));
    const enrolled = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaign.body.id}/participations`)
      .set(auth(member.accessToken))
      .send({});
    expect(enrolled.status).toBe(201);
    return {
      admin,
      member,
      customerId: customer.body.id as string,
      campaignId: campaign.body.id as string,
      definitionId: definition.body.id as string,
      participationId: enrolled.body.id as string,
      parentCommunityId,
      childCommunityId,
    };
  }

  it('counts approved days, then drops progress after reject and cancel', async () => {
    const ctx = await startedCampaign();
    const pledged = await request(app.getHttpServer())
      .post(`/api/v1/participations/${ctx.participationId}/commitments`)
      .set(auth(ctx.member.accessToken))
      .send({ typeKey: '发愿素', targetValue: 10, unit: 'days' });
    expect(pledged.status).toBe(201);

    const first = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: ctx.participationId,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2026-10-11',
      });
    const second = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: ctx.participationId,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2026-10-12',
      });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const afterRecord = await request(app.getHttpServer())
      .get(`/api/v1/participations/${ctx.participationId}/progress`)
      .set(auth(ctx.member.accessToken));
    expect(afterRecord.status).toBe(200);
    expect(afterRecord.body).toMatchObject({
      scope: 'participant',
      achievedValue: 2,
      targetValue: 10,
      completionPercent: 20,
      completionStatus: 'in_progress',
      timezone: 'Asia/Kuala_Lumpur',
    });

    const rejected = await request(app.getHttpServer())
      .post(`/api/v1/submissions/${second.body.submission.id}/reject`)
      .set(auth(ctx.admin.accessToken))
      .send({ note: 'not credible' });
    expect(rejected.status).toBe(200);

    const afterReject = await request(app.getHttpServer())
      .get(`/api/v1/participations/${ctx.participationId}/progress`)
      .set(auth(ctx.member.accessToken));
    expect(afterReject.body.achievedValue).toBe(1);
    expect(afterReject.body.completionPercent).toBe(10);

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/actions/${first.body.id}/cancel`)
      .set(auth(ctx.member.accessToken));
    expect(cancelled.status).toBe(200);

    const afterCancel = await request(app.getHttpServer())
      .get(`/api/v1/participations/${ctx.participationId}/progress`)
      .set(auth(ctx.member.accessToken));
    expect(afterCancel.body.achievedValue).toBe(0);
    expect(afterCancel.body.completionStatus).toBe('not_started');

    const achievement = await request(app.getHttpServer())
      .get(`/api/v1/participations/${ctx.participationId}/achievement`)
      .set(auth(ctx.member.accessToken));
    expect(achievement.body.achievedValue).toBe(0);
  });

  it('does not count manual submissions until they are approved', async () => {
    const ctx = await startedCampaign({
      configuration: {
        rulesStrategy: 'vegetarian',
        submissionReview: 'manual',
      },
    });
    await request(app.getHttpServer())
      .post(`/api/v1/participations/${ctx.participationId}/commitments`)
      .set(auth(ctx.member.accessToken))
      .send({ typeKey: 'fa_yuan_su', targetValue: 5, unit: 'days' });
    const recorded = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: ctx.participationId,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2026-10-12',
      });
    expect(recorded.body.submission.status).toBe('submitted');

    const pending = await request(app.getHttpServer())
      .get(`/api/v1/participations/${ctx.participationId}/progress`)
      .set(auth(ctx.member.accessToken));
    expect(pending.body.achievedValue).toBe(0);

    await request(app.getHttpServer())
      .post(`/api/v1/submissions/${recorded.body.submission.id}/approve`)
      .set(auth(ctx.admin.accessToken))
      .send({});

    const approved = await request(app.getHttpServer())
      .get(`/api/v1/participations/${ctx.participationId}/progress`)
      .set(auth(ctx.member.accessToken));
    expect(approved.body.achievedValue).toBe(1);
  });

  it('returns anonymous campaign and community-subtree aggregates', async () => {
    const ctx = await startedCampaign({ withCommunity: true });
    await request(app.getHttpServer())
      .post(`/api/v1/participations/${ctx.participationId}/commitments`)
      .set(auth(ctx.member.accessToken))
      .send({ typeKey: 'fa_yuan_su', targetValue: 10, unit: 'days' });
    await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: ctx.participationId,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2026-10-12',
      });

    const campaignProgress = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${ctx.campaignId}/progress`)
      .set(auth(ctx.member.accessToken));
    expect(campaignProgress.status).toBe(200);
    expect(campaignProgress.body.scope).toBe('campaign');
    expect(campaignProgress.body.units[0]).toMatchObject({
      unit: 'days',
      achievedValue: 1,
      targetValue: 10,
    });
    expect(JSON.stringify(campaignProgress.body)).not.toContain(
      ctx.member.userId,
    );
    expect(JSON.stringify(campaignProgress.body)).not.toContain(
      ctx.participationId,
    );

    const subtree = await request(app.getHttpServer())
      .get(
        `/api/v1/campaigns/${ctx.campaignId}/communities/${ctx.parentCommunityId}/progress`,
      )
      .set(auth(ctx.admin.accessToken));
    expect(subtree.status).toBe(200);
    expect(subtree.body).toMatchObject({
      scope: 'community',
      communityId: ctx.parentCommunityId,
      participantCount: 1,
    });
    expect(subtree.body.units[0].achievedValue).toBe(1);

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${ctx.campaignId}/achievements`)
      .set(auth(ctx.member.accessToken));
    expect(listed.body).toEqual([
      expect.objectContaining({
        participationId: ctx.participationId,
        userId: ctx.member.userId,
        achievedValue: 1,
      }),
    ]);
  });

  it('lets admins create and evaluate campaign milestones without resetting history', async () => {
    const ctx = await startedCampaign();
    await request(app.getHttpServer())
      .post(`/api/v1/participations/${ctx.participationId}/commitments`)
      .set(auth(ctx.member.accessToken))
      .send({ typeKey: 'fa_yuan_su', targetValue: 2, unit: 'days' });
    await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: ctx.participationId,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2026-10-11',
      });
    await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: ctx.participationId,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2026-10-12',
      });

    const created = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${ctx.campaignId}/milestones`)
      .set(auth(ctx.admin.accessToken))
      .send({
        name: 'Halfway',
        metric: 'completion_percent',
        thresholdValue: 50,
        unit: 'days',
      });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      metric: 'completion_percent',
      thresholdValue: 50,
      unit: 'days',
    });

    const memberCreate = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${ctx.campaignId}/milestones`)
      .set(auth(ctx.member.accessToken))
      .send({
        name: 'Forbidden',
        metric: 'achieved_value',
        thresholdValue: 1,
        unit: 'days',
      });
    expect(memberCreate.status).toBe(403);

    const live = await request(app.getHttpServer())
      .get(`/api/v1/milestones/${created.body.id}/progress`)
      .set(auth(ctx.member.accessToken));
    expect(live.status).toBe(200);
    expect(live.body.crossed).toBe(true);
    expect(live.body.currentCompletionPercent).toBe(100);

    const firstEval = await request(app.getHttpServer())
      .post(`/api/v1/milestones/${created.body.id}/evaluate`)
      .set(auth(ctx.admin.accessToken));
    expect(firstEval.status).toBe(200);
    expect(firstEval.body.crossed).toBe(true);

    const secondEval = await request(app.getHttpServer())
      .post(`/api/v1/milestones/${created.body.id}/evaluate`)
      .set(auth(ctx.admin.accessToken));
    expect(secondEval.status).toBe(200);

    const history = await request(app.getHttpServer())
      .get(`/api/v1/milestones/${created.body.id}/evaluations`)
      .set(auth(ctx.member.accessToken));
    expect(history.body).toHaveLength(2);
    expect(history.body.map((row: { id: string }) => row.id)).toEqual(
      expect.arrayContaining([firstEval.body.id, secondEval.body.id]),
    );
  });
});
