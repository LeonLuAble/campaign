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

describe('Auto enrolment (e2e)', () => {
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
      'admin-auto@example.com',
    );
    await promotePlatformAdmin(dataSource, admin.userId);
    const member = await registerActivatedUser(
      app,
      notifications,
      'member-auto@example.com',
    );
    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(admin.accessToken))
      .send({ name: 'Auto Enrol Org' });
    const community = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(admin.accessToken))
      .send({ customerId: customer.body.id, name: 'Branch' });
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
      memberRoleId: memberRole.id as string,
    };
  }

  async function createAutoCampaign(
    adminToken: string,
    customerId: string,
    communityId: string,
  ) {
    const template = await request(app.getHttpServer())
      .post('/api/v1/campaign-templates')
      .set(auth(adminToken))
      .send({
        customerId,
        name: 'Auto Template',
        key: `auto_tpl_${Date.now()}`,
      });
    const scope = await request(app.getHttpServer())
      .post('/api/v1/campaign-scopes')
      .set(auth(adminToken))
      .send({
        customerId,
        templateId: template.body.id,
        name: 'Auto Scope',
        key: `auto_scope_${Date.now()}`,
      });
    const created = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set(auth(adminToken))
      .send({
        customerId,
        templateId: template.body.id,
        scopeId: scope.body.id,
        name: 'Auto Campaign',
        timezone: 'Asia/Kuala_Lumpur',
        startsOn: '2026-01-01',
        endsOn: '2026-12-31',
        communityIds: [communityId],
        configuration: { enrolmentMode: 'auto' },
      });
    expect(created.status).toBe(201);
    return created.body.id as string;
  }

  it('auto-enrols eligible members on publish and blocks self-withdraw', async () => {
    const { admin, member, customerId, communityId } = await seededTenant();
    const campaignId = await createAutoCampaign(
      admin.accessToken,
      customerId,
      communityId,
    );

    const published = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignId}/publish`)
      .set(auth(admin.accessToken));
    expect(published.status).toBe(200);

    const list = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${campaignId}/participations`)
      .set(auth(admin.accessToken));
    expect(list.status).toBe(200);
    expect(list.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: member.userId,
          status: 'enrolled',
          enrolmentSource: 'auto',
          engagement: 'awaiting_commitment',
        }),
      ]),
    );

    const participationId = list.body.find(
      (row: { userId: string }) => row.userId === member.userId,
    ).id as string;

    const selfWithdraw = await request(app.getHttpServer())
      .post(`/api/v1/participations/${participationId}/withdraw`)
      .set(auth(member.accessToken));
    expect(selfWithdraw.status).toBe(409);
    expect(selfWithdraw.body.code).toBe('ENROLMENT_AUTO_MANAGED');

    const selfHeal = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignId}/participations`)
      .set(auth(member.accessToken))
      .send({});
    expect(selfHeal.status).toBe(201);
    expect(selfHeal.body.id).toBe(participationId);

    const sync = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignId}/auto-enrol/sync`)
      .set(auth(admin.accessToken));
    expect(sync.status).toBe(200);
    expect(sync.body).toMatchObject({
      created: 0,
      alreadyEnrolled: 1,
    });
  });

  it('enrols a member added after publish and does not resurrect withdrawn', async () => {
    const { admin, customerId, communityId, memberRoleId } =
      await seededTenant();
    const campaignId = await createAutoCampaign(
      admin.accessToken,
      customerId,
      communityId,
    );
    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignId}/publish`)
      .set(auth(admin.accessToken));

    const late = await registerActivatedUser(
      app,
      notifications,
      'late-auto@example.com',
    );
    const membership = await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        userId: late.userId,
        communityId,
      });
    await request(app.getHttpServer())
      .post(`/api/v1/memberships/${membership.body.id}/roles`)
      .set(auth(admin.accessToken))
      .send({ roleId: memberRoleId });

    const list = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${campaignId}/participations`)
      .set(auth(admin.accessToken));
    const lateRow = list.body.find(
      (row: { userId: string }) => row.userId === late.userId,
    );
    expect(lateRow).toMatchObject({
      status: 'enrolled',
      enrolmentSource: 'auto',
    });

    const withdrawn = await request(app.getHttpServer())
      .post(`/api/v1/participations/${lateRow.id}/withdraw`)
      .set(auth(admin.accessToken));
    expect(withdrawn.status).toBe(200);

    const sync = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignId}/auto-enrol/sync`)
      .set(auth(admin.accessToken));
    expect(sync.status).toBe(200);

    const afterSync = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${campaignId}/participations`)
      .set(auth(admin.accessToken));
    const stillWithdrawn = afterSync.body.find(
      (row: { userId: string }) => row.userId === late.userId,
    );
    expect(stillWithdrawn.status).toBe('withdrawn');
  });

  it('keeps opt_in self-enroll and withdraw behaviour', async () => {
    const { admin, member, customerId, communityId } = await seededTenant();
    const template = await request(app.getHttpServer())
      .post('/api/v1/campaign-templates')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        name: 'Opt In Template',
        key: `opt_in_${Date.now()}`,
      });
    const scope = await request(app.getHttpServer())
      .post('/api/v1/campaign-scopes')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        templateId: template.body.id,
        name: 'Opt In Scope',
        key: `opt_in_scope_${Date.now()}`,
      });
    const created = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        templateId: template.body.id,
        scopeId: scope.body.id,
        name: 'Opt In Campaign',
        timezone: 'Asia/Kuala_Lumpur',
        startsOn: '2026-01-01',
        endsOn: '2026-12-31',
        communityIds: [communityId],
        configuration: { enrolmentMode: 'opt_in' },
      });
    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${created.body.id}/publish`)
      .set(auth(admin.accessToken));

    const before = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${created.body.id}/participations`)
      .set(auth(admin.accessToken));
    expect(before.body).toHaveLength(0);

    const enrolled = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${created.body.id}/participations`)
      .set(auth(member.accessToken))
      .send({});
    expect(enrolled.status).toBe(201);
    expect(enrolled.body).toMatchObject({
      enrolmentSource: 'self',
      status: 'enrolled',
    });

    const withdrawn = await request(app.getHttpServer())
      .post(`/api/v1/participations/${enrolled.body.id}/withdraw`)
      .set(auth(member.accessToken));
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body.status).toBe('withdrawn');
  });
});
