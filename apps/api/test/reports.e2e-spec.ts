import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { DevNotificationSender } from '../src/modules/auth/infrastructure/dev-notification.sender.js';
import { csvContainsContactPii } from '../src/modules/reports/application/report-csv.js';
import {
  clearIdentityData,
  ensureIdentitySchema,
} from './ensure-identity-schema.js';
import {
  auth,
  promotePlatformAdmin,
  registerActivatedUser,
} from './tenant-test-helpers.js';

describe('Reports (e2e)', () => {
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
    await assignMemberRole(
      admin.accessToken,
      customer.body.id,
      membership.body.id,
    );
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
    await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(member.accessToken))
      .send({
        participationId: enrolled.body.id,
        actionDefinitionId: definition.body.id,
        occurredOn: '2026-10-12',
      });
    return {
      admin,
      member,
      customerId: customer.body.id as string,
      campaignId: campaign.body.id as string,
      participationId: enrolled.body.id as string,
    };
  }

  it('returns participant and anonymous campaign reports', async () => {
    const ctx = await startedCampaign();
    const own = await request(app.getHttpServer())
      .get(`/api/v1/participations/${ctx.participationId}/report`)
      .set(auth(ctx.member.accessToken));
    expect(own.status).toBe(200);
    expect(own.body.scope).toBe('participant');
    expect(own.body.userId).toBe(ctx.member.userId);
    expect(own.body).not.toHaveProperty('email');
    expect(own.body).not.toHaveProperty('rankings');

    const campaign = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${ctx.campaignId}/report`)
      .set(auth(ctx.member.accessToken));
    expect(campaign.status).toBe(200);
    expect(campaign.body.scope).toBe('campaign');
    expect(JSON.stringify(campaign.body)).not.toContain(ctx.member.userId);
    expect(JSON.stringify(campaign.body)).not.toContain(ctx.participationId);
    expect(campaign.body).not.toHaveProperty('leaderboard');
  });

  it('exports CSV for tenant admins without contact PII and forbids member export', async () => {
    const ctx = await startedCampaign();
    const forbidden = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${ctx.campaignId}/report/export`)
      .set(auth(ctx.member.accessToken));
    expect(forbidden.status).toBe(403);

    const exported = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${ctx.campaignId}/report/export`)
      .set(auth(ctx.admin.accessToken));
    expect(exported.status).toBe(200);
    expect(exported.headers['content-type']).toMatch(/text\/csv/);
    const csv = String(exported.text);
    expect(csv).toContain('rowType,scope,customerId');
    expect(csv).not.toContain('member@example.com');
    expect(csv).not.toContain(ctx.member.userId);
    expect(csvContainsContactPii(csv)).toBe(false);
  });
});
