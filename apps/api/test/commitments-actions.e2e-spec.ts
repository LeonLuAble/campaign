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

describe('Commitments and actions (e2e)', () => {
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

  async function startedCampaign() {
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
    const membership = await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set(auth(admin.accessToken))
      .send({ customerId: customer.body.id, userId: member.userId });
    const roles = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .query({ customerId: customer.body.id })
      .set(auth(admin.accessToken));
    const memberRole = roles.body.find(
      (role: { key: string }) => role.key === 'member',
    );
    await request(app.getHttpServer())
      .post(`/api/v1/memberships/${membership.body.id}/roles`)
      .set(auth(admin.accessToken))
      .send({ roleId: memberRole.id });

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
        configuration: { rulesStrategy: 'vegetarian' },
      });
    const definition = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaign.body.id}/action-definitions`)
      .set(auth(admin.accessToken))
      .send({ key: 'vegetarian_day', name: 'Vegetarian day', unit: 'days' });
    expect(definition.status).toBe(201);
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
    };
  }

  it('lets a member pledge and record a vegetarian day, then cancel it', async () => {
    const ctx = await startedCampaign();

    const pledged = await request(app.getHttpServer())
      .post(`/api/v1/participations/${ctx.participationId}/commitments`)
      .set(auth(ctx.member.accessToken))
      .send({ typeKey: '发愿素', targetValue: 30, unit: 'days' });
    expect(pledged.status).toBe(201);
    expect(pledged.body).toMatchObject({
      typeKey: 'fa_yuan_su',
      targetValue: 30,
      unit: 'days',
    });

    const recorded = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: ctx.participationId,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2026-10-12',
        idempotencyKey: 'day-2026-10-12',
      });
    expect(recorded.status).toBe(201);
    expect(recorded.body).toMatchObject({
      occurredOn: '2026-10-12',
      quantity: 1,
      privacyLevel: 'private',
      status: 'recorded',
      userId: ctx.member.userId,
    });
    expect(recorded.body.submission.status).toBe('submitted');

    const replay = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: ctx.participationId,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2026-10-12',
        idempotencyKey: 'day-2026-10-12',
      });
    expect(replay.status).toBe(201);
    expect(replay.body.id).toBe(recorded.body.id);

    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: ctx.participationId,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2026-10-12',
      });
    expect(duplicate.status).toBe(409);

    const cancelled = await request(app.getHttpServer())
      .post(`/api/v1/actions/${recorded.body.id}/cancel`)
      .set(auth(ctx.member.accessToken));
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe('cancelled');

    const rerecorded = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: ctx.participationId,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2026-10-12',
      });
    expect(rerecorded.status).toBe(201);
    expect(rerecorded.body.status).toBe('recorded');
  });

  it('rejects future dates, invalid vegetarian choices, and acting on another user', async () => {
    const ctx = await startedCampaign();
    const other = await registerActivatedUser(
      app,
      notifications,
      'other@example.com',
    );
    const otherMembership = await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set(auth(ctx.admin.accessToken))
      .send({ customerId: ctx.customerId, userId: other.userId });
    const roles = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .query({ customerId: ctx.customerId })
      .set(auth(ctx.admin.accessToken));
    const memberRole = roles.body.find(
      (role: { key: string }) => role.key === 'member',
    );
    await request(app.getHttpServer())
      .post(`/api/v1/memberships/${otherMembership.body.id}/roles`)
      .set(auth(ctx.admin.accessToken))
      .send({ roleId: memberRole.id });
    const otherEnrolled = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${ctx.campaignId}/participations`)
      .set(auth(ctx.admin.accessToken))
      .send({ userId: other.userId });

    const badChoice = await request(app.getHttpServer())
      .post(`/api/v1/participations/${ctx.participationId}/commitments`)
      .set(auth(ctx.member.accessToken))
      .send({ typeKey: 'keto', targetValue: 10, unit: 'days' });
    expect(badChoice.status).toBe(400);

    const future = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: ctx.participationId,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2099-12-31',
      });
    expect(future.status).toBe(400);

    const otherAction = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: otherEnrolled.body.id,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2026-10-12',
      });
    expect(otherAction.status).toBe(403);

    const recorded = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.admin.accessToken))
      .send({
        participationId: otherEnrolled.body.id,
        actionDefinitionId: ctx.definitionId,
        occurredOn: '2026-10-12',
      });
    expect(recorded.status).toBe(201);

    const hidden = await request(app.getHttpServer())
      .get(`/api/v1/actions/${recorded.body.id}`)
      .set(auth(ctx.member.accessToken));
    expect(hidden.status).toBe(404);

    const list = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${ctx.campaignId}/actions`)
      .set(auth(ctx.member.accessToken));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(0);

    const approved = await request(app.getHttpServer())
      .post(`/api/v1/submissions/${recorded.body.submission.id}/approve`)
      .set(auth(ctx.admin.accessToken))
      .send({ note: 'verified' });
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('approved');

    const memberApprove = await request(app.getHttpServer())
      .post(`/api/v1/submissions/${recorded.body.submission.id}/reject`)
      .set(auth(ctx.member.accessToken))
      .send({});
    expect(memberApprove.status).toBe(403);
  });
});
