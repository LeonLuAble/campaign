import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { PERMISSIONS } from '../src/modules/authorization/domain/permission-keys.js';
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

describe('Customers, communities, memberships (e2e)', () => {
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

  it('requires authentication for customer routes', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/customers',
    );
    expect(response.status).toBe(401);
  });

  it('rejects customer creation unless the caller is a platform admin', async () => {
    const user = await registerActivatedUser(
      app,
      notifications,
      'user@example.com',
    );
    const response = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(user.accessToken))
      .send({ name: 'Tzu Chi Malaysia' });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('creates a customer, seeds system roles, and lists it for the creator', async () => {
    const admin = await registerActivatedUser(
      app,
      notifications,
      'admin@example.com',
    );
    await promotePlatformAdmin(dataSource, admin.userId);

    const created = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(admin.accessToken))
      .send({ name: 'Tzu Chi Malaysia' });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: 'Tzu Chi Malaysia',
      slug: 'tzu-chi-malaysia',
      isActive: true,
    });
    expect(created.body.id).toEqual(expect.any(String));

    const list = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set(auth(admin.accessToken));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);

    const roles = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .query({ customerId: created.body.id })
      .set(auth(admin.accessToken));
    expect(roles.status).toBe(200);
    expect(roles.body.map((role: { key: string }) => role.key).sort()).toEqual([
      'member',
      'tenant_admin',
    ]);
    const adminRole = roles.body.find(
      (role: { key: string }) => role.key === 'tenant_admin',
    );
    expect(adminRole.permissionKeys).toEqual(
      expect.arrayContaining(Object.values(PERMISSIONS)),
    );
  });

  it('creates nested communities and assigns a member membership', async () => {
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

    const hq = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(admin.accessToken))
      .send({ customerId: customer.body.id, name: 'HQ' });
    expect(hq.status).toBe(201);
    expect(hq.body.parentId).toBeNull();

    const branch = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(admin.accessToken))
      .send({
        customerId: customer.body.id,
        parentId: hq.body.id,
        name: 'Penang',
      });
    expect(branch.status).toBe(201);
    expect(branch.body.parentId).toBe(hq.body.id);

    const membership = await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set(auth(admin.accessToken))
      .send({
        customerId: customer.body.id,
        userId: member.userId,
        communityId: branch.body.id,
      });
    expect(membership.status).toBe(201);
    expect(membership.body).toMatchObject({
      userId: member.userId,
      communityId: branch.body.id,
      isActive: true,
    });

    const memberRoles = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .query({ customerId: customer.body.id })
      .set(auth(admin.accessToken));
    const memberRole = memberRoles.body.find(
      (role: { key: string }) => role.key === 'member',
    );

    const assigned = await request(app.getHttpServer())
      .post(`/api/v1/memberships/${membership.body.id}/roles`)
      .set(auth(admin.accessToken))
      .send({ roleId: memberRole.id });
    expect(assigned.status).toBe(201);

    const visible = await request(app.getHttpServer())
      .get('/api/v1/communities')
      .query({ customerId: customer.body.id })
      .set(auth(member.accessToken));
    expect(visible.status).toBe(200);
    expect(visible.body.map((row: { name: string }) => row.name)).toEqual([
      'Penang',
    ]);

    const hiddenParent = await request(app.getHttpServer())
      .get(`/api/v1/communities/${hq.body.id}`)
      .set(auth(member.accessToken));
    expect(hiddenParent.status).toBe(404);
  });

  it('lets a member read but not update a customer', async () => {
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

    const read = await request(app.getHttpServer())
      .get(`/api/v1/customers/${customer.body.id}`)
      .set(auth(member.accessToken));
    expect(read.status).toBe(200);

    const update = await request(app.getHttpServer())
      .patch(`/api/v1/customers/${customer.body.id}`)
      .set(auth(member.accessToken))
      .send({ name: 'Hijacked' });
    expect(update.status).toBe(403);
    expect(update.body.code).toBe('FORBIDDEN');
  });

  it('seeds tenant_admin on initialAdminUserId and does not add the creator', async () => {
    const platformAdmin = await registerActivatedUser(
      app,
      notifications,
      'platform@example.com',
    );
    await promotePlatformAdmin(dataSource, platformAdmin.userId);
    const tenantAdmin = await registerActivatedUser(
      app,
      notifications,
      'tenant-admin@example.com',
    );

    const created = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platformAdmin.accessToken))
      .send({
        name: 'Tzu Chi Malaysia',
        initialAdminUserId: tenantAdmin.userId,
      });
    expect(created.status).toBe(201);

    const creatorList = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set(auth(platformAdmin.accessToken));
    expect(creatorList.status).toBe(200);
    expect(creatorList.body).toEqual([]);

    const creatorGet = await request(app.getHttpServer())
      .get(`/api/v1/customers/${created.body.id}`)
      .set(auth(platformAdmin.accessToken));
    expect(creatorGet.status).toBe(404);

    const tenantList = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set(auth(tenantAdmin.accessToken));
    expect(tenantList.status).toBe(200);
    expect(tenantList.body).toHaveLength(1);
    expect(tenantList.body[0].id).toBe(created.body.id);
  });

  it('creates a customer with a new initialAdmin and returns an activation token', async () => {
    const platformAdmin = await registerActivatedUser(
      app,
      notifications,
      'platform@example.com',
    );
    await promotePlatformAdmin(dataSource, platformAdmin.userId);

    const created = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platformAdmin.accessToken))
      .send({
        name: 'Acme Org',
        initialAdmin: {
          displayName: 'Acme Admin',
          email: 'acme.admin@example.com',
        },
      });
    expect(created.status).toBe(201);
    expect(created.body.activationToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({
        token: created.body.activationToken,
        password: 'password123',
      })
      .expect(204);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: 'acme.admin@example.com',
        password: 'password123',
      });
    expect(login.status).toBe(200);

    const list = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set(auth(login.body.accessToken));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);
  });

  it('adds an existing activated user as initialAdmin without an activation token', async () => {
    const platformAdmin = await registerActivatedUser(
      app,
      notifications,
      'platform2@example.com',
    );
    await promotePlatformAdmin(dataSource, platformAdmin.userId);
    const existing = await registerActivatedUser(
      app,
      notifications,
      'existing.admin@example.com',
    );

    const created = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platformAdmin.accessToken))
      .send({
        name: 'Beta Org',
        initialAdmin: { email: 'existing.admin@example.com' },
      });
    expect(created.status).toBe(201);
    expect(created.body.activationToken).toBeUndefined();

    const list = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set(auth(existing.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.map((row: { id: string }) => row.id)).toContain(
      created.body.id,
    );
  });

  it('rejects create when both initialAdminUserId and initialAdmin are supplied', async () => {
    const platformAdmin = await registerActivatedUser(
      app,
      notifications,
      'platform3@example.com',
    );
    await promotePlatformAdmin(dataSource, platformAdmin.userId);
    const existing = await registerActivatedUser(
      app,
      notifications,
      'both@example.com',
    );

    const created = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platformAdmin.accessToken))
      .send({
        name: 'Dup Fields',
        initialAdminUserId: existing.userId,
        initialAdmin: { email: 'both@example.com' },
      });
    expect(created.status).toBe(400);
  });

  it('lists the permission catalog for an authenticated user', async () => {
    const user = await registerActivatedUser(
      app,
      notifications,
      'user@example.com',
    );
    const response = await request(app.getHttpServer())
      .get('/api/v1/permissions')
      .set(auth(user.accessToken));
    expect(response.status).toBe(200);
    expect(response.body.map((row: { key: string }) => row.key)).toEqual(
      expect.arrayContaining(Object.values(PERMISSIONS)),
    );
  });
});
