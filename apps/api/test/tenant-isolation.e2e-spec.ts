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
import { auth, registerActivatedUser } from './tenant-test-helpers.js';

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

    const createdA = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(userA.accessToken))
      .send({ name: 'Customer A' });
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
      .set(auth(userB.accessToken))
      .send({ name: 'Customer B' });
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

  it('database trigger rejects a membership that points at another tenant community', async () => {
    await expect(
      dataSource.query(
        `INSERT INTO memberships (tenant_id, user_id, community_id)
         VALUES ($1, $2, $3)`,
        [tenantA.id, userA.userId, tenantB.communityId],
      ),
    ).rejects.toThrow(/same tenant/);
  });
});
