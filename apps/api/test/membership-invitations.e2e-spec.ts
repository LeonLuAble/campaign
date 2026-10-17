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

describe('Membership invitations and communityPath import (B6 e2e)', () => {
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
    const platform = await registerActivatedUser(
      app,
      notifications,
      'platform.b6@example.com',
    );
    await promotePlatformAdmin(dataSource, platform.userId);
    const admin = await registerActivatedUser(
      app,
      notifications,
      'admin.b6@example.com',
    );
    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platform.accessToken))
      .send({
        name: 'Invite Customer',
        initialAdminUserId: admin.userId,
      });
    expect(customer.status).toBe(201);
    const region = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(admin.accessToken))
      .send({ customerId: customer.body.id, name: 'Region' });
    const branch = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(admin.accessToken))
      .send({
        customerId: customer.body.id,
        parentId: region.body.id,
        name: 'Branch',
      });
    const other = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(admin.accessToken))
      .send({ customerId: customer.body.id, name: 'Other' });
    notifications.clear();
    return {
      admin,
      customerId: customer.body.id as string,
      regionId: region.body.id as string,
      branchId: branch.body.id as string,
      otherId: other.body.id as string,
    };
  }

  it('invites by email, is idempotent, and resends activation', async () => {
    const { admin, customerId, branchId } = await seededTenant();

    const invited = await request(app.getHttpServer())
      .post('/api/v1/memberships/invitations')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        email: 'invitee@example.com',
        displayName: 'Invitee',
        communityId: branchId,
      });
    expect(invited.status).toBe(201);
    expect(invited.body).toMatchObject({
      customerId,
      communityId: branchId,
      email: 'invitee@example.com',
      activationStatus: 'pending',
      created: true,
    });
    expect(invited.body.activationLink).toBeUndefined();

    const mail = notifications
      .drain()
      .filter((message) => message.template === 'activation')
      .at(-1);
    expect(mail?.to).toBe('invitee@example.com');
    expect(mail?.token).toEqual(expect.any(String));
    notifications.clear();

    const again = await request(app.getHttpServer())
      .post('/api/v1/memberships/invitations')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        email: 'invitee@example.com',
        communityId: branchId,
      });
    expect(again.status).toBe(201);
    expect(again.body.membershipId).toBe(invited.body.membershipId);
    expect(again.body.created).toBe(false);
    expect(
      notifications.drain().filter((message) => message.template === 'activation'),
    ).toHaveLength(0);

    const resent = await request(app.getHttpServer())
      .post(
        `/api/v1/memberships/${invited.body.membershipId}/resend-activation`,
      )
      .set(auth(admin.accessToken));
    expect(resent.status).toBe(202);
    expect(resent.body.accepted).toBe(true);
    const token = notifications
      .drain()
      .filter((message) => message.template === 'activation')
      .at(-1)?.token;
    expect(token).toEqual(expect.any(String));

    const activated = await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token, password: 'password123' });
    expect(activated.status).toBe(204);

    const conflict = await request(app.getHttpServer())
      .post(
        `/api/v1/memberships/${invited.body.membershipId}/resend-activation`,
      )
      .set(auth(admin.accessToken));
    expect(conflict.status).toBe(409);
  });

  it('returns a one-time activation link for mobile-only invites', async () => {
    const { admin, customerId, branchId } = await seededTenant();

    const invited = await request(app.getHttpServer())
      .post('/api/v1/memberships/invitations')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        mobile: '0123456789',
        displayName: 'Mobile Only',
        communityId: branchId,
      });
    expect(invited.status).toBe(201);
    expect(invited.body.activationStatus).toBe('pending');
    expect(invited.body.activationLink).toMatch(/\/activate\?token=/);
    expect(
      notifications.drain().filter((message) => message.template === 'activation'),
    ).toHaveLength(0);

    const resent = await request(app.getHttpServer())
      .post(
        `/api/v1/memberships/${invited.body.membershipId}/resend-activation`,
      )
      .set(auth(admin.accessToken));
    expect(resent.status).toBe(202);
    expect(resent.body.activationLink).toMatch(/\/activate\?token=/);
  });

  it('resolves communityPath on import and errors on unknown paths', async () => {
    const { admin, customerId } = await seededTenant();

    const uploaded = await request(app.getHttpServer())
      .post('/api/v1/user-imports')
      .query({ customerId })
      .set(auth(admin.accessToken))
      .attach(
        'file',
        Buffer.from(
          'email,community_path\n' +
            'ok@example.com,Region/Branch\n' +
            'bad@example.com,Region/Missing\n',
        ),
        'paths.csv',
      );
    expect(uploaded.status).toBe(201);

    const validated = await request(app.getHttpServer())
      .post(`/api/v1/user-imports/${uploaded.body.id}/validate`)
      .query({ customerId })
      .set(auth(admin.accessToken));
    expect(validated.status).toBe(200);

    const preview = await request(app.getHttpServer())
      .get(`/api/v1/user-imports/${uploaded.body.id}/preview`)
      .query({ customerId })
      .set(auth(admin.accessToken));
    expect(preview.status).toBe(200);
    const rows = preview.body.rows as Array<{
      email: string | null;
      status: string;
      errorCode: string | null;
      communityId: string | null;
    }>;
    const ok = rows.find((row) => row.email === 'ok@example.com');
    const bad = rows.find((row) => row.email === 'bad@example.com');
    expect(ok?.status).toBe('valid');
    expect(ok?.communityId).toEqual(expect.any(String));
    expect(bad?.status).toBe('invalid');
    expect(bad?.errorCode).toBe('UNKNOWN_COMMUNITY_PATH');
  });

  it('lets a community-scoped caller invite only into their subtree', async () => {
    const { admin, customerId, regionId, branchId, otherId } =
      await seededTenant();
    const leader = await registerActivatedUser(
      app,
      notifications,
      'leader.b6@example.com',
    );

    const leaderMembership = await request(app.getHttpServer())
      .post('/api/v1/memberships')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        userId: leader.userId,
        communityId: regionId,
      });
    const leaderRole = await request(app.getHttpServer())
      .post('/api/v1/roles')
      .set(auth(admin.accessToken))
      .send({
        customerId,
        name: 'Inviter',
        key: 'subtree_inviter',
        permissionKeys: [
          'memberships.create',
          'memberships.update',
          'memberships.read',
          'communities.read',
          'customers.read',
          'roles.read',
        ],
      });
    expect(leaderRole.status).toBe(201);
    await request(app.getHttpServer())
      .post(`/api/v1/memberships/${leaderMembership.body.id}/roles`)
      .set(auth(admin.accessToken))
      .send({ roleId: leaderRole.body.id });

    const intoSubtree = await request(app.getHttpServer())
      .post('/api/v1/memberships/invitations')
      .set(auth(leader.accessToken))
      .send({
        customerId,
        email: 'subtree@example.com',
        communityId: branchId,
      });
    expect(intoSubtree.status).toBe(201);

    const outside = await request(app.getHttpServer())
      .post('/api/v1/memberships/invitations')
      .set(auth(leader.accessToken))
      .send({
        customerId,
        email: 'outside@example.com',
        communityId: otherId,
      });
    expect(outside.status).toBe(404);

    const escalate = await request(app.getHttpServer())
      .post('/api/v1/memberships/invitations')
      .set(auth(leader.accessToken))
      .send({
        customerId,
        email: 'adminish@example.com',
        communityId: branchId,
        roleKeys: ['tenant_admin'],
      });
    expect(escalate.status).toBe(403);
  });

  it('keeps invites tenant-isolated', async () => {
    const a = await seededTenant();
    const platform = await registerActivatedUser(
      app,
      notifications,
      'platform.b6b@example.com',
    );
    await promotePlatformAdmin(dataSource, platform.userId);
    const otherAdmin = await registerActivatedUser(
      app,
      notifications,
      'admin.other@example.com',
    );
    const otherCustomer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(platform.accessToken))
      .send({
        name: 'Other Customer',
        initialAdminUserId: otherAdmin.userId,
      });

    const cross = await request(app.getHttpServer())
      .post('/api/v1/memberships/invitations')
      .set(auth(otherAdmin.accessToken))
      .send({
        customerId: a.customerId,
        email: 'cross@example.com',
        communityId: a.branchId,
      });
    expect([403, 404]).toContain(cross.status);

    const intoOwn = await request(app.getHttpServer())
      .post('/api/v1/memberships/invitations')
      .set(auth(otherAdmin.accessToken))
      .send({
        customerId: otherCustomer.body.id,
        email: 'own@example.com',
      });
    expect(intoOwn.status).toBe(201);
  });
});
