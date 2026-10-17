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

describe('Membership directory and customer access (B1) (e2e)', () => {
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

  it('returns caller access for members and 404 for non-members', async () => {
    const platform = await registerActivatedUser(
      app,
      notifications,
      'platform@example.com',
    );
    await promotePlatformAdmin(dataSource, platform.userId);
    const admin = await registerActivatedUser(
      app,
      notifications,
      'admin@example.com',
    );
    const outsider = await registerActivatedUser(
      app,
      notifications,
      'outsider@example.com',
    );

    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platform.accessToken))
      .send({ name: 'Access Customer', initialAdminUserId: admin.userId });
    expect(customer.status).toBe(201);

    const access = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customer.body.id}/access`)
      .set(auth(admin.accessToken));
    expect(access.status).toBe(200);
    expect(access.body.isTenantLevel).toBe(true);
    expect(access.body.communityIds).toEqual([]);
    expect(access.body.permissionKeys).toEqual(
      expect.arrayContaining(['memberships.read', 'customers.read']),
    );
    expect(access.body.roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'tenant_admin' }),
      ]),
    );

    const platformAccess = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customer.body.id}/access`)
      .set(auth(platform.accessToken));
    expect(platformAccess.status).toBe(404);

    const outsiderAccess = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customer.body.id}/access`)
      .set(auth(outsider.accessToken));
    expect(outsiderAccess.status).toBe(404);
  });

  it('lists memberships with user summaries, filters, and contact masking', async () => {
    const platform = await registerActivatedUser(
      app,
      notifications,
      'platform2@example.com',
    );
    await promotePlatformAdmin(dataSource, platform.userId);
    const admin = await registerActivatedUser(
      app,
      notifications,
      'tenant.admin@example.com',
    );
    const pending = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ identifier: 'pending.member@example.com', password: 'password123' });
    expect(pending.status).toBe(201);
    const leader = await registerActivatedUser(
      app,
      notifications,
      'leader@example.com',
    );
    const sibling = await registerActivatedUser(
      app,
      notifications,
      'sibling@example.com',
    );

    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platform.accessToken))
      .send({
        name: 'Directory Customer',
        initialAdminUserId: admin.userId,
      });
    const hq = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(admin.accessToken))
      .send({ customerId: customer.body.id, name: 'HQ' });
    const branch = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(admin.accessToken))
      .send({
        customerId: customer.body.id,
        parentId: hq.body.id,
        name: 'Branch',
      });
    const other = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(admin.accessToken))
      .send({ customerId: customer.body.id, name: 'Other Root' });

    await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set(auth(admin.accessToken))
      .send({
        customerId: customer.body.id,
        userId: pending.body.id,
        communityId: branch.body.id,
      });
    await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set(auth(admin.accessToken))
      .send({
        customerId: customer.body.id,
        userId: sibling.userId,
        communityId: other.body.id,
      });

    const leaderMembership = await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set(auth(admin.accessToken))
      .send({
        customerId: customer.body.id,
        userId: leader.userId,
        communityId: hq.body.id,
      });
    const leaderRole = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set(auth(admin.accessToken))
      .send({
        customerId: customer.body.id,
        name: 'Community Leader',
        key: 'community_leader',
        permissionKeys: ['memberships.read', 'communities.read', 'customers.read'],
      });
    expect(leaderRole.status).toBe(201);
    await request(app.getHttpServer())
      .post(`/api/v1/memberships/${leaderMembership.body.id}/roles`)
      .set(auth(admin.accessToken))
      .send({ roleId: leaderRole.body.id });

    const tenantList = await request(app.getHttpServer())
      .get('/api/v1/memberships')
      .query({ customerId: customer.body.id, q: 'pending.member' })
      .set(auth(admin.accessToken));
    expect(tenantList.status).toBe(200);
    expect(tenantList.body.items).toHaveLength(1);
    expect(tenantList.body.items[0].user).toMatchObject({
      id: pending.body.id,
      email: 'pending.member@example.com',
      activationStatus: 'pending',
    });
    expect(tenantList.body.items[0].community).toEqual({
      id: branch.body.id,
      name: 'Branch',
    });

    const pendingFilter = await request(app.getHttpServer())
      .get('/api/v1/memberships')
      .query({ customerId: customer.body.id, status: 'pending' })
      .set(auth(admin.accessToken));
    expect(pendingFilter.status).toBe(200);
    expect(
      pendingFilter.body.items.every(
        (row: { user: { activationStatus: string } }) =>
          row.user.activationStatus === 'pending',
      ),
    ).toBe(true);

    const subtree = await request(app.getHttpServer())
      .get('/api/v1/memberships')
      .query({
        customerId: customer.body.id,
        communityId: hq.body.id,
        includeDescendants: true,
      })
      .set(auth(admin.accessToken));
    expect(subtree.status).toBe(200);
    const subtreeUserIds = subtree.body.items.map(
      (row: { userId: string }) => row.userId,
    );
    expect(subtreeUserIds).toEqual(
      expect.arrayContaining([leader.userId, pending.body.id]),
    );
    expect(subtreeUserIds).not.toContain(sibling.userId);

    const leaderList = await request(app.getHttpServer())
      .get('/api/v1/memberships')
      .query({ customerId: customer.body.id })
      .set(auth(leader.accessToken));
    expect(leaderList.status).toBe(200);
    const leaderUserIds = leaderList.body.items.map(
      (row: { userId: string }) => row.userId,
    );
    expect(leaderUserIds).toEqual(
      expect.arrayContaining([leader.userId, pending.body.id]),
    );
    expect(leaderUserIds).not.toContain(sibling.userId);
    expect(leaderUserIds).not.toContain(admin.userId);
    for (const row of leaderList.body.items) {
      expect(row.user.email).toBeUndefined();
      expect(row.user.mobile).toBeUndefined();
      expect(row.user.activationStatus).toEqual(expect.any(String));
    }

    const leaderAccess = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customer.body.id}/access`)
      .set(auth(leader.accessToken));
    expect(leaderAccess.status).toBe(200);
    expect(leaderAccess.body.isTenantLevel).toBe(false);
    expect(leaderAccess.body.communityIds).toEqual([hq.body.id]);
  });
});
