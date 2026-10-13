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
import { auth, registerActivatedUser } from './tenant-test-helpers.js';

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

  it('creates a customer, seeds system roles, and lists it for the creator', async () => {
    const admin = await registerActivatedUser(
      app,
      notifications,
      'admin@example.com',
    );

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
