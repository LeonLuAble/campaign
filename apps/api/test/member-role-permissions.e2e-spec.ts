import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { MEMBER_PERMISSION_KEYS } from '../src/modules/authorization/domain/permission-keys.js';
import { DevNotificationSender } from '../src/modules/auth/infrastructure/dev-notification.sender.js';
import { TightenMemberRolePermissions1792866113000 } from '../src/platform/database/migrations/1792866113000-TightenMemberRolePermissions.js';
import {
  clearIdentityData,
  ensureIdentitySchema,
} from './ensure-identity-schema.js';
import {
  auth,
  promotePlatformAdmin,
  registerActivatedUser,
} from './tenant-test-helpers.js';

describe('Member role permissions (F1 / F-SEC-1) (e2e)', () => {
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

  async function seedTenantWithMember() {
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
    expect(customer.status).toBe(201);
    const customerId = customer.body.id as string;

    const membership = await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set(auth(admin.accessToken))
      .send({ customerId, userId: member.userId });
    expect(membership.status).toBe(201);

    const roles = await request(app.getHttpServer())
      .get('/api/v1/roles')
      .query({ customerId })
      .set(auth(admin.accessToken));
    const memberRole = roles.body.find(
      (role: { key: string }) => role.key === 'member',
    );
    expect(memberRole).toBeDefined();

    const assigned = await request(app.getHttpServer())
      .post(`/api/v1/memberships/${membership.body.id}/roles`)
      .set(auth(admin.accessToken))
      .send({ roleId: memberRole.id });
    expect(assigned.status).toBe(201);

    const uploaded = await request(app.getHttpServer())
      .post('/api/v1/user-imports')
      .query({ customerId })
      .set(auth(admin.accessToken))
      .attach(
        'file',
        Buffer.from('email,mobile\nimported@example.com,\n'),
        'members.csv',
      );
    expect(uploaded.status).toBe(201);

    return {
      admin,
      member,
      customerId,
      importId: uploaded.body.id as string,
      memberRoleId: memberRole.id as string,
    };
  }

  it('denies members and allows tenant admins on import, membership, and role reads', async () => {
    const { admin, member, customerId, importId, memberRoleId } =
      await seedTenantWithMember();

    const memberPaths = [
      '/api/v1/user-imports',
      `/api/v1/user-imports/${importId}/rows`,
      '/api/v1/memberships',
      '/api/v1/roles',
    ];
    for (const path of memberPaths) {
      const response = await request(app.getHttpServer())
        .get(path)
        .query({ customerId })
        .set(auth(member.accessToken));
      expect(response.status).toBe(403);
      expect(response.body.code).toBe('FORBIDDEN');
    }

    for (const path of memberPaths) {
      const response = await request(app.getHttpServer())
        .get(path)
        .query({ customerId })
        .set(auth(admin.accessToken));
      expect(response.status).toBe(200);
    }

    const seededMember = await request(app.getHttpServer())
      .get(`/api/v1/roles/${memberRoleId}`)
      .query({ customerId })
      .set(auth(admin.accessToken));
    expect(seededMember.status).toBe(200);
    expect(seededMember.body.permissionKeys.sort()).toEqual(
      [...MEMBER_PERMISSION_KEYS].sort(),
    );
    expect(seededMember.body.permissionKeys).toEqual(
      expect.not.arrayContaining([
        'memberships.read',
        'roles.read',
        'user_imports.read',
      ]),
    );
  });

  it('migration strips forbidden reads from existing member roles', async () => {
    const { admin, customerId, memberRoleId } = await seedTenantWithMember();

    await dataSource.query(
      `
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT $1, p.id
      FROM permissions p
      WHERE p.key IN ('memberships.read', 'roles.read', 'user_imports.read')
      ON CONFLICT DO NOTHING
      `,
      [memberRoleId],
    );

    const queryRunner = dataSource.createQueryRunner();
    try {
      await new TightenMemberRolePermissions1792866113000().up(queryRunner);
    } finally {
      await queryRunner.release();
    }

    const after = await request(app.getHttpServer())
      .get(`/api/v1/roles/${memberRoleId}`)
      .query({ customerId })
      .set(auth(admin.accessToken));
    expect(after.status).toBe(200);
    expect(after.body.permissionKeys).toEqual(
      expect.not.arrayContaining([
        'memberships.read',
        'roles.read',
        'user_imports.read',
      ]),
    );
    expect(after.body.permissionKeys.sort()).toEqual(
      [...MEMBER_PERMISSION_KEYS].sort(),
    );
  });
});
