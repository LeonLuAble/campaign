import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { DevNotificationSender } from '../src/modules/auth/infrastructure/dev-notification.sender.js';
import { SYSTEM_ROLE_TENANT_ADMIN } from '../src/modules/authorization/domain/permission-keys.js';
import {
  clearIdentityData,
  ensureIdentitySchema,
} from './ensure-identity-schema.js';
import {
  auth,
  promotePlatformAdmin,
  registerActivatedUser,
} from './tenant-test-helpers.js';

describe('Platform onboarding (B3 e2e)', () => {
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

  it('onboards a customer with first admin by email end-to-end', async () => {
    const platform = await registerActivatedUser(
      app,
      notifications,
      'platform@example.com',
    );
    await promotePlatformAdmin(dataSource, platform.userId);
    notifications.clear();

    const created = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platform.accessToken))
      .send({
        name: 'Tzu Chi Malaysia',
        initialAdmin: {
          email: 'tzuchi.admin@example.com',
          displayName: 'Tzu Chi Admin',
          locale: 'zh-Hans',
        },
      });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('Tzu Chi Malaysia');

    const activation = notifications
      .drain()
      .filter((message) => message.template === 'activation')
      .at(-1);
    expect(activation?.to).toBe('tzuchi.admin@example.com');
    expect(activation?.token).toEqual(expect.any(String));
    expect(activation?.locale).toBe('zh-Hans');

    const roles = await dataSource.query(
      `SELECT key FROM roles WHERE tenant_id = $1 ORDER BY key`,
      [created.body.id],
    );
    expect(roles.map((row: { key: string }) => row.key)).toEqual([
      'member',
      SYSTEM_ROLE_TENANT_ADMIN,
    ]);

    const membership = await dataSource.query(
      `
      SELECT m.user_id, r.key
      FROM memberships m
      INNER JOIN membership_roles mr ON mr.membership_id = m.id
      INNER JOIN roles r ON r.id = mr.role_id
      WHERE m.tenant_id = $1 AND r.key = $2
      `,
      [created.body.id, SYSTEM_ROLE_TENANT_ADMIN],
    );
    expect(membership).toHaveLength(1);

    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({
        token: activation!.token,
        password: 'password123',
      })
      .expect(204);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: 'tzuchi.admin@example.com',
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

  it('lists platform customers with admin counts for platform admins only', async () => {
    const platform = await registerActivatedUser(
      app,
      notifications,
      'platform-list@example.com',
    );
    await promotePlatformAdmin(dataSource, platform.userId);
    const member = await registerActivatedUser(
      app,
      notifications,
      'member-list@example.com',
    );

    const created = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platform.accessToken))
      .send({
        name: 'List Org',
        initialAdmin: { email: 'pending.admin@example.com' },
      });
    expect(created.status).toBe(201);

    const platformList = await request(app.getHttpServer())
      .get('/api/v1/platform/customers')
      .set(auth(platform.accessToken));
    expect(platformList.status).toBe(200);
    expect(platformList.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.id,
          name: 'List Org',
          slug: expect.any(String),
          isActive: true,
          createdAt: expect.any(String),
          adminCount: 1,
          pendingAdminInvites: 1,
        }),
      ]),
    );
    expect(Object.keys(platformList.body[0]).sort()).toEqual([
      'adminCount',
      'createdAt',
      'id',
      'isActive',
      'name',
      'pendingAdminInvites',
      'slug',
    ]);

    const forbidden = await request(app.getHttpServer())
      .get('/api/v1/platform/customers')
      .set(auth(member.accessToken));
    expect(forbidden.status).toBe(403);

    const noTenantData = await request(app.getHttpServer())
      .get(`/api/v1/customers/${created.body.id}`)
      .set(auth(platform.accessToken));
    expect(noTenantData.status).toBe(404);

    const membershipList = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set(auth(platform.accessToken));
    expect(membershipList.status).toBe(200);
    expect(membershipList.body).toEqual([]);
  });

  it('adds an existing email as membership only and invites additional admins', async () => {
    const platform = await registerActivatedUser(
      app,
      notifications,
      'platform-invite@example.com',
    );
    await promotePlatformAdmin(dataSource, platform.userId);
    const existing = await registerActivatedUser(
      app,
      notifications,
      'existing.admin@example.com',
    );
    notifications.clear();

    const created = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platform.accessToken))
      .send({
        name: 'Existing Email Org',
        initialAdmin: { email: 'existing.admin@example.com' },
      });
    expect(created.status).toBe(201);
    expect(created.body.activationToken).toBeUndefined();

    const added = notifications
      .drain()
      .filter((message) => message.template === 'customer_added');
    expect(added).toHaveLength(1);
    expect(added[0].to).toBe('existing.admin@example.com');
    expect(added[0].payload?.customerName).toBe('Existing Email Org');

    const existingList = await request(app.getHttpServer())
      .get('/api/v1/customers')
      .set(auth(existing.accessToken));
    expect(existingList.body.map((row: { id: string }) => row.id)).toContain(
      created.body.id,
    );

    notifications.clear();
    const invited = await request(app.getHttpServer())
      .post(`/api/v1/platform/customers/${created.body.id}/admins`)
      .set(auth(platform.accessToken))
      .send({
        email: 'second.admin@example.com',
        displayName: 'Second Admin',
      });
    expect(invited.status).toBe(201);
    expect(invited.body.activationStatus).toBe('pending');
    expect(invited.body.userId).toEqual(expect.any(String));

    const activation = notifications
      .drain()
      .filter((message) => message.template === 'activation')
      .at(-1);
    expect(activation?.to).toBe('second.admin@example.com');

    notifications.clear();
    const resent = await request(app.getHttpServer())
      .post(
        `/api/v1/platform/customers/${created.body.id}/admins/${invited.body.userId}/resend`,
      )
      .set(auth(platform.accessToken));
    expect(resent.status).toBe(202);
    expect(resent.body).toEqual({ accepted: true });
    expect(
      notifications.drain().some((message) => message.template === 'activation'),
    ).toBe(true);

    const platformList = await request(app.getHttpServer())
      .get('/api/v1/platform/customers')
      .set(auth(platform.accessToken));
    const summary = platformList.body.find(
      (row: { id: string }) => row.id === created.body.id,
    );
    expect(summary.adminCount).toBe(2);
    expect(summary.pendingAdminInvites).toBe(1);
  });

  it('rejects invalid or conflicting create payloads with clear errors', async () => {
    const platform = await registerActivatedUser(
      app,
      notifications,
      'platform-errors@example.com',
    );
    await promotePlatformAdmin(dataSource, platform.userId);
    const existing = await registerActivatedUser(
      app,
      notifications,
      'both-fields@example.com',
    );

    const both = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platform.accessToken))
      .send({
        name: 'Bad',
        initialAdminUserId: existing.userId,
        initialAdmin: { email: 'both-fields@example.com' },
      });
    expect(both.status).toBe(400);

    const invalidEmail = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platform.accessToken))
      .send({
        name: 'Bad Email',
        initialAdmin: { email: 'not-an-email' },
      });
    expect(invalidEmail.status).toBe(400);

    const nonPlatform = await registerActivatedUser(
      app,
      notifications,
      'not-platform@example.com',
    );
    const forbidden = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(nonPlatform.accessToken))
      .send({
        name: 'Nope',
        initialAdmin: { email: 'x@example.com' },
      });
    expect(forbidden.status).toBe(403);
  });
});
