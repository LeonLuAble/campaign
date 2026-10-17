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

describe('Campaigns and participations (e2e)', () => {
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
    return {
      admin,
      member,
      customerId: customer.body.id as string,
      communityId: community.body.id as string,
    };
  }

  it('creates a campaign, walks lifecycle, and enrolls a member', async () => {
    const { admin, member, customerId, communityId } = await seededTenant();

    const template = await request(app.getHttpServer())
      .post('/api/v1/campaign-templates')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        name: 'Environmental Action',
        key: 'environmental_action',
      });
    expect(template.status).toBe(201);
    expect(template.body.key).toBe('environmental_action');

    const scope = await request(app.getHttpServer())
      .post('/api/v1/campaign-scopes')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        templateId: template.body.id,
        name: 'Vegetarian',
        key: 'vegetarian',
      });
    expect(scope.status).toBe(201);

    const created = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        templateId: template.body.id,
        scopeId: scope.body.id,
        name: '速素数数',
        timezone: 'Asia/Kuala_Lumpur',
        startsOn: '2026-01-01',
        endsOn: '2026-12-31',
        communityIds: [communityId],
        configuration: { locale: 'zh-Hans' },
      });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: '速素数数',
      status: 'draft',
      timezone: 'Asia/Kuala_Lumpur',
      startsOn: '2026-01-01',
      endsOn: '2026-12-31',
      communityIds: [communityId],
      configuration: { locale: 'zh-Hans' },
    });

    const skip = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${created.body.id}/start`)
      .set(auth(admin.accessToken));
    expect(skip.status).toBe(400);

    const published = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${created.body.id}/publish`)
      .set(auth(admin.accessToken));
    expect(published.status).toBe(200);
    expect(published.body.status).toBe('published');

    const locked = await request(app.getHttpServer())
      .patch(`/api/v1/campaigns/${created.body.id}`)
      .set(auth(admin.accessToken))
      .send({ name: 'Changed' });
    expect(locked.status).toBe(409);
    expect(locked.body.code).toBe('CAMPAIGN_FIELD_LOCKED');

    const started = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${created.body.id}/start`)
      .set(auth(admin.accessToken));
    expect(started.status).toBe(200);
    expect(started.body.status).toBe('started');

    const enrolled = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${created.body.id}/participations`)
      .set(auth(admin.accessToken))
      .send({ userId: member.userId });
    expect(enrolled.status).toBe(201);
    expect(enrolled.body).toMatchObject({
      campaignId: created.body.id,
      userId: member.userId,
      status: 'enrolled',
    });

    const memberList = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${created.body.id}/participations`)
      .set(auth(member.accessToken));
    expect(memberList.status).toBe(200);
    expect(memberList.body).toHaveLength(1);

    const withdrawn = await request(app.getHttpServer())
      .post(`/api/v1/participations/${enrolled.body.id}/withdraw`)
      .set(auth(admin.accessToken));
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body.status).toBe('withdrawn');
  });

  it('lets a member read but not create a campaign', async () => {
    const { admin, member, customerId } = await seededTenant();
    const template = await request(app.getHttpServer())
      .post('/api/v1/campaign-templates')
      .set(auth(admin.accessToken))
      .send({ customerId, name: 'Environmental Action' });
    const scope = await request(app.getHttpServer())
      .post('/api/v1/campaign-scopes')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        templateId: template.body.id,
        name: 'Vegetarian',
      });
    const created = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        templateId: template.body.id,
        scopeId: scope.body.id,
        name: '速素数数',
        timezone: 'Asia/Kuala_Lumpur',
      });

    const read = await request(app.getHttpServer())
      .get('/api/v1/campaigns')
      .query({ customerId })
      .set(auth(member.accessToken));
    expect(read.status).toBe(200);
    expect(read.body.map((row: { id: string }) => row.id)).toContain(
      created.body.id,
    );

    const create = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set(auth(member.accessToken))
      .send({
        customerId,
        templateId: template.body.id,
        scopeId: scope.body.id,
        name: 'Hijacked',
        timezone: 'UTC',
      });
    expect(create.status).toBe(403);
  });

  it('lets a member self-enroll and self-withdraw but not act on another user', async () => {
    const { admin, member, customerId } = await seededTenant();
    const other = await registerActivatedUser(
      app,
      notifications,
      'other@example.com',
    );
    const otherMembership = await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set(auth(admin.accessToken))
      .send({ customerId, userId: other.userId });
    const roles = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .query({ customerId })
      .set(auth(admin.accessToken));
    const memberRole = roles.body.find(
      (role: { key: string }) => role.key === 'member',
    );
    await request(app.getHttpServer())
      .post(`/api/v1/memberships/${otherMembership.body.id}/roles`)
      .set(auth(admin.accessToken))
      .send({ roleId: memberRole.id });

    const template = await request(app.getHttpServer())
      .post('/api/v1/campaign-templates')
      .set(auth(admin.accessToken))
      .send({ customerId, name: 'Environmental Action' });
    const scope = await request(app.getHttpServer())
      .post('/api/v1/campaign-scopes')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        templateId: template.body.id,
        name: 'Vegetarian',
      });
    const created = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        templateId: template.body.id,
        scopeId: scope.body.id,
        name: '速素数数',
        timezone: 'Asia/Kuala_Lumpur',
      });
    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${created.body.id}/publish`)
      .set(auth(admin.accessToken));

    const enrollOther = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${created.body.id}/participations`)
      .set(auth(member.accessToken))
      .send({ userId: other.userId });
    expect(enrollOther.status).toBe(403);
    expect(enrollOther.body.code).toBe('FORBIDDEN');

    const enrollSelf = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${created.body.id}/participations`)
      .set(auth(member.accessToken))
      .send({});
    expect(enrollSelf.status).toBe(201);
    expect(enrollSelf.body).toMatchObject({
      userId: member.userId,
      status: 'enrolled',
    });

    const otherEnrolled = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${created.body.id}/participations`)
      .set(auth(admin.accessToken))
      .send({ userId: other.userId });
    expect(otherEnrolled.status).toBe(201);

    const withdrawOther = await request(app.getHttpServer())
      .post(`/api/v1/participations/${otherEnrolled.body.id}/withdraw`)
      .set(auth(member.accessToken));
    expect(withdrawOther.status).toBe(404);

    const withdrawSelf = await request(app.getHttpServer())
      .post(`/api/v1/participations/${enrollSelf.body.id}/withdraw`)
      .set(auth(member.accessToken));
    expect(withdrawSelf.status).toBe(200);
    expect(withdrawSelf.body.status).toBe('withdrawn');
  });
});
