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

describe('Campaign wizard API support C1 (e2e)', () => {
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

  async function seededTenant() {
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
    const community = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(admin.accessToken))
      .send({ customerId: customer.body.id, name: 'KL' });
    const membership = await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set(auth(admin.accessToken))
      .send({
        customerId: customer.body.id,
        userId: member.userId,
        communityId: community.body.id,
      });
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
    return {
      admin,
      member,
      customerId: customer.body.id as string,
      communityId: community.body.id as string,
      templateId: template.body.id as string,
      scopeId: scope.body.id as string,
    };
  }

  it('lists campaign rule strategies with Accept-Language labels and recommendations', async () => {
    const { admin, customerId } = await seededTenant();
    const en = await request(app.getHttpServer())
      .get('/api/v1/campaign-rule-strategies')
      .query({ customerId })
      .set(auth(admin.accessToken))
      .set('Accept-Language', 'en');
    expect(en.status).toBe(200);
    expect(en.body.map((row: { key: string }) => row.key)).toEqual(
      expect.arrayContaining(['generic', 'vegetarian']),
    );
    const vegetarian = en.body.find(
      (row: { key: string }) => row.key === 'vegetarian',
    );
    expect(vegetarian.recommendedActionDefinitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'vegetarian_day',
          unit: 'days',
          name: 'Vegetarian day',
        }),
        expect.objectContaining({
          key: 'vegetarian_meal',
          unit: 'meals',
          name: 'Vegetarian meal',
        }),
      ]),
    );
    expect(JSON.stringify(en.body.find((r: { key: string }) => r.key === 'generic'))).not.toContain(
      '随缘素',
    );

    const zh = await request(app.getHttpServer())
      .get('/api/v1/campaign-rule-strategies')
      .query({ customerId })
      .set(auth(admin.accessToken))
      .set('Accept-Language', 'zh-Hans');
    expect(zh.status).toBe(200);
    const vegetarianZh = zh.body.find(
      (row: { key: string }) => row.key === 'vegetarian',
    );
    expect(vegetarianZh.label).toBe('速素数数');
  });

  it('localizes commitment-options labels and falls back for campaign content', async () => {
    const ctx = await seededTenant();
    const created = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set(auth(ctx.admin.accessToken))
      .set('Accept-Language', 'zh-Hans')
      .send({
        customerId: ctx.customerId,
        templateId: ctx.templateId,
        scopeId: ctx.scopeId,
        name: '速素数数',
        description: '主要说明',
        timezone: 'Asia/Kuala_Lumpur',
        startsOn: '2026-01-01',
        endsOn: '2026-12-31',
        communityIds: [ctx.communityId],
        configuration: { rulesStrategy: 'vegetarian' },
        translations: {
          en: {
            name: 'Vegetarian Fast',
            description: 'English description',
            treeDisplayName: 'Kindness Tree',
          },
        },
      });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('速素数数');

    const enCampaign = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${created.body.id}`)
      .set(auth(ctx.admin.accessToken))
      .set('Accept-Language', 'en');
    expect(enCampaign.status).toBe(200);
    expect(enCampaign.body.name).toBe('Vegetarian Fast');
    expect(enCampaign.body.description).toBe('English description');

    const zhCampaign = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${created.body.id}`)
      .set(auth(ctx.admin.accessToken))
      .set('Accept-Language', 'zh-Hans');
    expect(zhCampaign.body.name).toBe('速素数数');
    expect(zhCampaign.body.description).toBe('主要说明');

    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${created.body.id}/publish`)
      .set(auth(ctx.admin.accessToken));
    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${created.body.id}/start`)
      .set(auth(ctx.admin.accessToken));

    const optionsEn = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${created.body.id}/commitment-options`)
      .set(auth(ctx.member.accessToken))
      .set('Accept-Language', 'en');
    expect(optionsEn.status).toBe(200);
    expect(optionsEn.body.choices).toHaveLength(7);
    const faYuan = optionsEn.body.choices.find(
      (choice: { key: string }) => choice.key === 'fa_yuan_su',
    );
    expect(faYuan).toMatchObject({
      name: '发愿素',
      label: 'Fa Yuan Su',
    });
    expect(faYuan.description).toBeTruthy();

    const optionsZh = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${created.body.id}/commitment-options`)
      .set(auth(ctx.member.accessToken))
      .set('Accept-Language', 'zh-Hans');
    expect(
      optionsZh.body.choices.find(
        (choice: { key: string }) => choice.key === 'fa_yuan_su',
      ).label,
    ).toBe('发愿素');
  });

  it('allows safe post-publish edits and rejects shortening endsOn', async () => {
    const ctx = await seededTenant();
    const created = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set(auth(ctx.admin.accessToken))
      .send({
        customerId: ctx.customerId,
        templateId: ctx.templateId,
        scopeId: ctx.scopeId,
        name: '速素数数',
        timezone: 'Asia/Kuala_Lumpur',
        startsOn: '2026-01-01',
        endsOn: '2026-12-31',
        communityIds: [ctx.communityId],
      });
    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${created.body.id}/publish`)
      .set(auth(ctx.admin.accessToken));

    const locked = await request(app.getHttpServer())
      .patch(`/api/v1/campaigns/${created.body.id}`)
      .set(auth(ctx.admin.accessToken))
      .send({ name: 'Changed' });
    expect(locked.status).toBe(409);
    expect(locked.body.code).toBe('CAMPAIGN_FIELD_LOCKED');

    const shortened = await request(app.getHttpServer())
      .patch(`/api/v1/campaigns/${created.body.id}`)
      .set(auth(ctx.admin.accessToken))
      .send({ endsOn: '2026-06-01' });
    expect(shortened.status).toBe(409);
    expect(shortened.body.code).toBe('CAMPAIGN_END_DATE_LOCKED');

    const ok = await request(app.getHttpServer())
      .patch(`/api/v1/campaigns/${created.body.id}`)
      .set(auth(ctx.admin.accessToken))
      .send({
        description: 'Extended season',
        endsOn: '2027-01-15',
      });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({
      description: 'Extended season',
      endsOn: '2027-01-15',
      status: 'published',
    });
  });
});
