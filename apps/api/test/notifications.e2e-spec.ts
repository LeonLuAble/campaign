import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { DevNotificationSender } from '../src/modules/auth/infrastructure/dev-notification.sender.js';
import { ReminderScheduler } from '../src/modules/notifications/application/reminder-scheduler.js';
import {
  clearIdentityData,
  ensureIdentitySchema,
} from './ensure-identity-schema.js';
import {
  auth,
  promotePlatformAdmin,
  registerActivatedUser,
} from './tenant-test-helpers.js';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let notifications: DevNotificationSender;
  let reminders: ReminderScheduler;

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
    reminders = app.get(ReminderScheduler);
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

  async function publishedCampaign() {
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
        timezone: 'UTC',
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

  it('creates an in-app and email campaign-started notification for enrolled members', async () => {
    const ctx = await publishedCampaign();
    notifications.clear();
    const started = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${ctx.campaignId}/start`)
      .set(auth(ctx.admin.accessToken));
    expect(started.status).toBe(200);

    const inbox = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .query({ customerId: ctx.customerId })
      .set(auth(ctx.member.accessToken));
    expect(inbox.status).toBe(200);
    expect(inbox.body).toHaveLength(1);
    expect(inbox.body[0]).toMatchObject({
      type: 'campaign_started',
      locale: 'en',
      title: 'Campaign started',
    });
    expect(inbox.body[0].body).toContain('速素数数');

    const emailed = notifications
      .drain()
      .filter((message) => message.template === 'campaign_started');
    expect(emailed).toHaveLength(1);
    expect(emailed[0]?.to).toBe('member@example.com');
    expect(emailed[0]?.channel).toBe('email');
  });

  it('skips email when the member opted out and still stores in-app copy', async () => {
    const ctx = await publishedCampaign();
    const prefs = await request(app.getHttpServer())
      .put('/api/v1/me/notification-preferences')
      .set(auth(ctx.member.accessToken))
      .send({ emailEnabled: false, reminderLocalTime: '00:00' });
    expect(prefs.status).toBe(200);
    expect(prefs.body.emailEnabled).toBe(false);

    notifications.clear();
    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${ctx.campaignId}/start`)
      .set(auth(ctx.admin.accessToken));

    const inbox = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .query({ customerId: ctx.customerId })
      .set(auth(ctx.member.accessToken));
    expect(inbox.body).toHaveLength(1);
    expect(
      notifications
        .drain()
        .filter((message) => message.template === 'campaign_started'),
    ).toHaveLength(0);
  });

  it('marks own notifications read and renders zh-Hans templates from locale preference', async () => {
    const ctx = await publishedCampaign();
    const profile = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set(auth(ctx.member.accessToken))
      .send({ locale: 'zh-Hans', timezone: 'UTC' });
    expect(profile.status).toBe(200);
    expect(profile.body.locale).toBe('zh-Hans');

    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${ctx.campaignId}/start`)
      .set(auth(ctx.admin.accessToken));

    const inbox = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .query({ customerId: ctx.customerId })
      .set(auth(ctx.member.accessToken));
    expect(inbox.body[0].locale).toBe('zh-Hans');
    expect(inbox.body[0].title).toBe('活动已开始');

    const read = await request(app.getHttpServer())
      .post(`/api/v1/notifications/${inbox.body[0].id}/read`)
      .query({ customerId: ctx.customerId })
      .set(auth(ctx.member.accessToken));
    expect(read.status).toBe(200);
    expect(read.body.readAt).toEqual(expect.any(String));
  });

  it('schedules a daily reminder only when no approved action exists for the campaign day', async () => {
    const ctx = await publishedCampaign();
    await request(app.getHttpServer())
      .put('/api/v1/me/notification-preferences')
      .set(auth(ctx.member.accessToken))
      .send({ reminderLocalTime: '00:00' });
    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${ctx.campaignId}/start`)
      .set(auth(ctx.admin.accessToken));

    const utcNow = new Date();
    const year = utcNow.getUTCFullYear();
    const month = utcNow.getUTCMonth();
    const day = utcNow.getUTCDate();
    const yesterdayNoon = new Date(Date.UTC(year, month, day - 1, 12, 0, 0));
    const todayNoon = new Date(Date.UTC(year, month, day, 12, 0, 0));
    const todayIso = todayNoon.toISOString().slice(0, 10);

    const first = await reminders.processDueReminders(yesterdayNoon);
    expect(first).toBeGreaterThanOrEqual(1);

    const inbox = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .query({ customerId: ctx.customerId })
      .set(auth(ctx.member.accessToken));
    expect(
      inbox.body.some(
        (row: { type: string }) => row.type === 'action_reminder',
      ),
    ).toBe(true);

    const second = await reminders.processDueReminders(yesterdayNoon);
    expect(second).toBe(0);

    const recorded = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(ctx.member.accessToken))
      .send({
        participationId: ctx.participationId,
        actionDefinitionId: ctx.definitionId,
        occurredOn: todayIso,
      });
    expect(recorded.status).toBe(201);
    const skipped = await reminders.processDueReminders(todayNoon);
    expect(skipped).toBe(0);
  });
});
