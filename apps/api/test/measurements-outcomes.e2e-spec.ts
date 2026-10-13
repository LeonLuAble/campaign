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

describe('Measurements, outcomes, visualization and dashboards (e2e)', () => {
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

  async function startedCampaign(options?: { withCommunity?: boolean }) {
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
        configuration: { rulesStrategy: 'vegetarian' },
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

  it('converts approved days with a cited factor and drops rejected rows', async () => {
    const ctx = await startedCampaign();
    const definition = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${ctx.campaignId}/measurement-definitions`)
      .set(auth(ctx.admin.accessToken))
      .send({ name: 'Vegetarian days', sourceUnit: 'days' });
    expect(definition.status).toBe(201);

    const memberCreate = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${ctx.campaignId}/measurement-definitions`)
      .set(auth(ctx.member.accessToken))
      .send({ name: 'Forbidden', sourceUnit: 'meals' });
    expect(memberCreate.status).toBe(403);

    const factor = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${ctx.campaignId}/impact-factors`)
      .set(auth(ctx.admin.accessToken))
      .send({
        sourceUnit: 'days',
        outcomeMetric: 'co2_kg',
        outcomeUnit: 'kg',
        factorValue: 2,
        source: 'Admin-cited conversion, not a platform default',
        effectiveFrom: '2020-01-01',
      });
    expect(factor.status).toBe(201);
    expect(factor.body.version).toBe(1);
    expect(factor.body.source).toContain('Admin-cited');

    const first = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: ctx.participationId,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2026-10-11',
        privacyLevel: 'private',
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

    const beforeReject = await request(app.getHttpServer())
      .get(`/api/v1/participations/${ctx.participationId}/outcomes`)
      .set(auth(ctx.member.accessToken));
    expect(beforeReject.status).toBe(200);
    expect(beforeReject.body.outcomes[0]).toMatchObject({
      outcomeMetric: 'co2_kg',
      value: 4,
      sourceQuantity: 2,
    });

    await request(app.getHttpServer())
      .post(`/api/v1/submissions/${second.body.submission.id}/reject`)
      .set(auth(ctx.admin.accessToken))
      .send({ note: 'not credible' });

    const afterReject = await request(app.getHttpServer())
      .get(`/api/v1/participations/${ctx.participationId}/outcomes`)
      .set(auth(ctx.member.accessToken));
    expect(afterReject.body.outcomes[0].value).toBe(2);

    const visualization = await request(app.getHttpServer())
      .put(`/api/v1/campaigns/${ctx.campaignId}/visualization`)
      .set(auth(ctx.admin.accessToken))
      .send({ type: 'tree', settings: { displayName: '素心树' } });
    expect(visualization.status).toBe(200);
    expect(visualization.body.type).toBe('tree');

    const dashboard = await request(app.getHttpServer())
      .get(`/api/v1/participations/${ctx.participationId}/dashboard`)
      .query({ granularity: 'week' })
      .set(auth(ctx.member.accessToken));
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.scope).toBe('participant');
    expect(dashboard.body.outcomes[0].value).toBe(2);
    expect(dashboard.body.timeSeries.granularity).toBe('week');
    expect(dashboard.body.visualization.displayName).toBe('素心树');
    expect(dashboard.body.progress).toBeDefined();
  });

  it('keeps campaign dashboards anonymous and includes a community subtree', async () => {
    const ctx = await startedCampaign({ withCommunity: true });
    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${ctx.campaignId}/measurement-definitions`)
      .set(auth(ctx.admin.accessToken))
      .send({ name: 'Vegetarian days', sourceUnit: 'days' });
    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${ctx.campaignId}/impact-factors`)
      .set(auth(ctx.admin.accessToken))
      .send({
        sourceUnit: 'days',
        outcomeMetric: 'water_liters',
        outcomeUnit: 'L',
        factorValue: 10,
        source: 'Tenant-configured citation',
        effectiveFrom: '2020-01-01',
      });
    await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: ctx.participationId,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2026-10-12',
        privacyLevel: 'private',
      });

    const campaignDashboard = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${ctx.campaignId}/dashboard`)
      .set(auth(ctx.member.accessToken));
    expect(campaignDashboard.status).toBe(200);
    expect(campaignDashboard.body.scope).toBe('campaign');
    expect(campaignDashboard.body.outcomes[0].value).toBe(10);
    expect(JSON.stringify(campaignDashboard.body)).not.toContain(
      ctx.member.userId,
    );
    expect(JSON.stringify(campaignDashboard.body)).not.toContain(
      ctx.participationId,
    );
    expect(campaignDashboard.body).not.toHaveProperty('rankings');
    expect(campaignDashboard.body).not.toHaveProperty('leaderboard');

    const communityDashboard = await request(app.getHttpServer())
      .get(
        `/api/v1/campaigns/${ctx.campaignId}/communities/${ctx.parentCommunityId}/dashboard`,
      )
      .set(auth(ctx.admin.accessToken));
    expect(communityDashboard.status).toBe(200);
    expect(communityDashboard.body).toMatchObject({
      scope: 'community',
      communityId: ctx.parentCommunityId,
    });
    expect(communityDashboard.body.measurements[0].quantity).toBe(1);
  });
});
