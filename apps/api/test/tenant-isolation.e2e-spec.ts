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

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let notifications: DevNotificationSender;
  let tenantA: { id: string; communityId: string; membershipId: string };
  let tenantB: { id: string; communityId: string; membershipId: string };
  let userA: { userId: string; accessToken: string };
  let userB: { userId: string; accessToken: string };

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

    userA = await registerActivatedUser(app, notifications, 'a@example.com');
    userB = await registerActivatedUser(app, notifications, 'b@example.com');
    const platformAdmin = await registerActivatedUser(
      app,
      notifications,
      'platform@example.com',
    );
    await promotePlatformAdmin(dataSource, platformAdmin.userId);

    const createdA = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platformAdmin.accessToken))
      .send({ name: 'Customer A', initialAdminUserId: userA.userId });
    const communityA = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(userA.accessToken))
      .send({ customerId: createdA.body.id, name: 'Community A' });
    const membershipsA = await request(app.getHttpServer())
      .get('/api/v1/memberships')
      .query({ customerId: createdA.body.id })
      .set(auth(userA.accessToken));

    const createdB = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platformAdmin.accessToken))
      .send({ name: 'Customer B', initialAdminUserId: userB.userId });
    const communityB = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(userB.accessToken))
      .send({ customerId: createdB.body.id, name: 'Community B' });
    const membershipsB = await request(app.getHttpServer())
      .get('/api/v1/memberships')
      .query({ customerId: createdB.body.id })
      .set(auth(userB.accessToken));

    tenantA = {
      id: createdA.body.id,
      communityId: communityA.body.id,
      membershipId: membershipsA.body[0].id,
    };
    tenantB = {
      id: createdB.body.id,
      communityId: communityB.body.id,
      membershipId: membershipsB.body[0].id,
    };
  });

  it('does not list another customer', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set(auth(userA.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.map((row: { id: string }) => row.id)).toEqual([
      tenantA.id,
    ]);
  });

  it('returns 404 when reading another customer', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/customers/${tenantB.id}`)
      .set(auth(userA.accessToken));
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });

  it('returns 404 when updating another customer', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${tenantB.id}`)
      .set(auth(userA.accessToken))
      .send({ name: 'Hijacked' });
    expect(response.status).toBe(404);
  });

  it('returns 404 when listing or mutating another customer community', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/communities')
      .query({ customerId: tenantB.id })
      .set(auth(userA.accessToken));
    expect(list.status).toBe(404);

    const get = await request(app.getHttpServer())
      .get(`/api/v1/communities/${tenantB.communityId}`)
      .set(auth(userA.accessToken));
    expect(get.status).toBe(404);

    const create = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(userA.accessToken))
      .send({ customerId: tenantB.id, name: 'Intruder' });
    expect(create.status).toBe(404);

    const update = await request(app.getHttpServer())
      .patch(`/api/v1/communities/${tenantB.communityId}`)
      .set(auth(userA.accessToken))
      .send({ name: 'Hijacked' });
    expect(update.status).toBe(404);
  });

  it('returns 404 when reading or modifying another customer membership', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/memberships')
      .query({ customerId: tenantB.id })
      .set(auth(userA.accessToken));
    expect(list.status).toBe(404);

    const get = await request(app.getHttpServer())
      .get(`/api/v1/memberships/${tenantB.membershipId}`)
      .set(auth(userA.accessToken));
    expect(get.status).toBe(404);

    const create = await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set(auth(userA.accessToken))
      .send({ customerId: tenantB.id, userId: userA.userId });
    expect(create.status).toBe(404);

    const deactivate = await request(app.getHttpServer())
      .delete(`/api/v1/memberships/${tenantB.membershipId}`)
      .set(auth(userA.accessToken));
    expect(deactivate.status).toBe(404);
  });

  it('rejects attaching a community from another tenant as a parent', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(userA.accessToken))
      .send({
        customerId: tenantA.id,
        parentId: tenantB.communityId,
        name: 'Cross tenant child',
      });
    expect(response.status).toBe(404);
  });

  it('does not list or confirm another customer user import', async () => {
    const csv = 'email,first_name\nisolate@example.com,Iso\n';
    const uploaded = await request(app.getHttpServer())
      .post('/api/v1/user-imports')
      .query({ customerId: tenantB.id })
      .set(auth(userB.accessToken))
      .attach('file', Buffer.from(csv), 'b.csv');
    expect(uploaded.status).toBe(201);

    const list = await request(app.getHttpServer())
      .get('/api/v1/user-imports')
      .query({ customerId: tenantB.id })
      .set(auth(userA.accessToken));
    expect(list.status).toBe(404);

    const get = await request(app.getHttpServer())
      .get(`/api/v1/user-imports/${uploaded.body.id}`)
      .query({ customerId: tenantA.id })
      .set(auth(userA.accessToken));
    expect(get.status).toBe(404);

    const confirm = await request(app.getHttpServer())
      .post(`/api/v1/user-imports/${uploaded.body.id}/confirm`)
      .query({ customerId: tenantA.id })
      .set(auth(userA.accessToken));
    expect(confirm.status).toBe(404);
  });

  it('does not auto-link an email that already belongs to another customer', async () => {
    const uploaded = await request(app.getHttpServer())
      .post('/api/v1/user-imports')
      .query({ customerId: tenantA.id })
      .set(auth(userA.accessToken))
      .attach('file', Buffer.from(`email\n${'b@example.com'}\n`), 'cross.csv');
    const validated = await request(app.getHttpServer())
      .post(`/api/v1/user-imports/${uploaded.body.id}/validate`)
      .query({ customerId: tenantA.id })
      .set(auth(userA.accessToken));
    expect(validated.status).toBe(200);

    const rows = await request(app.getHttpServer())
      .get(`/api/v1/user-imports/${uploaded.body.id}/rows`)
      .query({ customerId: tenantA.id })
      .set(auth(userA.accessToken));
    expect(rows.body).toEqual([
      expect.objectContaining({
        status: 'review',
        errorCode: 'EXISTING_IDENTITY',
      }),
    ]);
  });

  it('database trigger rejects a membership that points at another tenant community', async () => {
    await expect(
      dataSource.query(
        `INSERT INTO memberships (tenant_id, user_id, community_id)
         VALUES ($1, $2, $3)`,
        [tenantA.id, userA.userId, tenantB.communityId],
      ),
    ).rejects.toThrow(/same tenant/);
  });

  it('does not list or mutate another customer campaign', async () => {
    const templateB = await request(app.getHttpServer())
      .post('/api/v1/campaign-templates')
      .set(auth(userB.accessToken))
      .send({ customerId: tenantB.id, name: 'Template B' });
    const scopeB = await request(app.getHttpServer())
      .post('/api/v1/campaign-scopes')
      .set(auth(userB.accessToken))
      .send({
        customerId: tenantB.id,
        templateId: templateB.body.id,
        name: 'Scope B',
      });
    const campaignB = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set(auth(userB.accessToken))
      .send({
        customerId: tenantB.id,
        templateId: templateB.body.id,
        scopeId: scopeB.body.id,
        name: 'Campaign B',
        timezone: 'UTC',
      });
    expect(campaignB.status).toBe(201);

    const list = await request(app.getHttpServer())
      .get('/api/v1/campaigns')
      .query({ customerId: tenantB.id })
      .set(auth(userA.accessToken));
    expect(list.status).toBe(404);

    const get = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${campaignB.body.id}`)
      .set(auth(userA.accessToken));
    expect(get.status).toBe(404);

    const publish = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignB.body.id}/publish`)
      .set(auth(userA.accessToken));
    expect(publish.status).toBe(404);

    const enroll = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignB.body.id}/participations`)
      .set(auth(userA.accessToken))
      .send({ userId: userA.userId });
    expect(enroll.status).toBe(404);
  });

  it('database trigger rejects a campaign community from another tenant', async () => {
    const templateA = await request(app.getHttpServer())
      .post('/api/v1/campaign-templates')
      .set(auth(userA.accessToken))
      .send({ customerId: tenantA.id, name: 'Template A' });
    const scopeA = await request(app.getHttpServer())
      .post('/api/v1/campaign-scopes')
      .set(auth(userA.accessToken))
      .send({
        customerId: tenantA.id,
        templateId: templateA.body.id,
        name: 'Scope A',
      });
    const campaignA = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set(auth(userA.accessToken))
      .send({
        customerId: tenantA.id,
        templateId: templateA.body.id,
        scopeId: scopeA.body.id,
        name: 'Campaign A',
        timezone: 'UTC',
      });

    await expect(
      dataSource.query(
        `INSERT INTO campaign_communities (campaign_id, community_id, tenant_id)
         VALUES ($1, $2, $3)`,
        [campaignA.body.id, tenantB.communityId, tenantA.id],
      ),
    ).rejects.toThrow(/same tenant/);
  });

  it('does not list or mutate another customer action or commitment', async () => {
    const templateB = await request(app.getHttpServer())
      .post('/api/v1/campaign-templates')
      .set(auth(userB.accessToken))
      .send({ customerId: tenantB.id, name: 'Template B' });
    const scopeB = await request(app.getHttpServer())
      .post('/api/v1/campaign-scopes')
      .set(auth(userB.accessToken))
      .send({
        customerId: tenantB.id,
        templateId: templateB.body.id,
        name: 'Scope B',
      });
    const campaignB = await request(app.getHttpServer())
      .post('/api/v1/campaigns')
      .set(auth(userB.accessToken))
      .send({
        customerId: tenantB.id,
        templateId: templateB.body.id,
        scopeId: scopeB.body.id,
        name: 'Campaign B',
        timezone: 'UTC',
        startsOn: '2020-01-01',
        endsOn: '2099-12-31',
      });
    const definitionB = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignB.body.id}/action-definitions`)
      .set(auth(userB.accessToken))
      .send({ name: 'Day', unit: 'days' });
    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignB.body.id}/publish`)
      .set(auth(userB.accessToken));
    await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignB.body.id}/start`)
      .set(auth(userB.accessToken));
    const enrolledB = await request(app.getHttpServer())
      .post(`/api/v1/campaigns/${campaignB.body.id}/participations`)
      .set(auth(userB.accessToken))
      .send({});
    const commitmentB = await request(app.getHttpServer())
      .post(`/api/v1/participations/${enrolledB.body.id}/commitments`)
      .set(auth(userB.accessToken))
      .send({ targetValue: 10, unit: 'days' });
    const actionB = await request(app.getHttpServer())
      .post('/api/v1/actions')
      .set(auth(userB.accessToken))
      .send({
        participationId: enrolledB.body.id,
        actionDefinitionId: definitionB.body.id,
        occurredOn: '2026-10-12',
      });
    expect(commitmentB.status).toBe(201);
    expect(actionB.status).toBe(201);

    const getAction = await request(app.getHttpServer())
      .get(`/api/v1/actions/${actionB.body.id}`)
      .set(auth(userA.accessToken));
    expect(getAction.status).toBe(404);

    const getCommitment = await request(app.getHttpServer())
      .get(`/api/v1/commitments/${commitmentB.body.id}`)
      .set(auth(userA.accessToken));
    expect(getCommitment.status).toBe(404);

    const listActions = await request(app.getHttpServer())
      .get(`/api/v1/campaigns/${campaignB.body.id}/actions`)
      .set(auth(userA.accessToken));
    expect(listActions.status).toBe(404);
  });
});
