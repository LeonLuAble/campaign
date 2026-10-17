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

describe('User imports (e2e)', () => {
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

  async function seededAdmin() {
    const admin = await registerActivatedUser(
      app,
      notifications,
      'admin@example.com',
    );
    await promotePlatformAdmin(dataSource, admin.userId);
    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(auth(admin.accessToken))
      .send({ name: 'Tzu Chi Malaysia' });
    const community = await request(app.getHttpServer())
      .post('/api/v1/communities')
      .set(auth(admin.accessToken))
      .send({ customerId: customer.body.id, name: 'KL' });
    return { admin, customerId: customer.body.id as string, community };
  }

  it('imports users, reports per-row results, and activates by setting a password', async () => {
    const { admin, customerId, community } = await seededAdmin();

    const uploaded = await request(app.getHttpServer())
      .post('/api/v1/user-imports')
      .query({ customerId, communityId: community.body.id })
      .set(auth(admin.accessToken))
      .attach(
        'file',
        Buffer.from(
          'external_id,email,mobile,first_name\n' +
            'E1,mei@example.com,0123456789,Mei\n' +
            'E2,not-an-email,,Bad\n' +
            'E1,dup@example.com,,Dup\n',
        ),
        'members.csv',
      );
    expect(uploaded.status).toBe(201);
    expect(uploaded.body.status).toBe('mapped');

    const importId = uploaded.body.id as string;
    const validated = await request(app.getHttpServer())
      .post(`/api/v1/user-imports/${importId}/validate`)
      .query({ customerId })
      .set(auth(admin.accessToken));
    expect(validated.status).toBe(200);
    expect(validated.body.status).toBe('validated');

    const preview = await request(app.getHttpServer())
      .get(`/api/v1/user-imports/${importId}/preview`)
      .query({ customerId })
      .set(auth(admin.accessToken));
    expect(preview.status).toBe(200);
    const previewRows = preview.body.rows as Array<{
      email: string | null;
      status: string;
      errorCode: string | null;
    }>;
    expect(previewRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: 'mei@example.com',
          status: 'valid',
        }),
        expect.objectContaining({
          status: 'invalid',
          errorCode: 'INVALID_EMAIL',
        }),
        expect.objectContaining({
          status: 'invalid',
          errorCode: 'DUPLICATE_ROW',
        }),
      ]),
    );

    const confirmed = await request(app.getHttpServer())
      .post(`/api/v1/user-imports/${importId}/confirm`)
      .query({ customerId })
      .set(auth(admin.accessToken));
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.status).toBe('confirmed');
    expect(confirmed.body.counts.created).toBe(1);

    const rows = await request(app.getHttpServer())
      .get(`/api/v1/user-imports/${importId}/rows`)
      .query({ customerId })
      .set(auth(admin.accessToken));
    const created = rows.body.find(
      (row: { email: string | null }) => row.email === 'mei@example.com',
    );
    expect(created.status).toBe('created');
    expect(created.resolvedUserId).toBeTruthy();

    const invitation = notifications
      .drain()
      .filter((message) => message.template === 'activation')
      .at(-1);
    expect(invitation?.to).toBe('mei@example.com');

    const withoutPassword = await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: invitation?.token });
    expect(withoutPassword.status).toBe(400);

    const activated = await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: invitation?.token, password: 'imported-pass' });
    expect(activated.status).toBe(204);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: 'mei@example.com', password: 'imported-pass' });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();

    const memberships = await request(app.getHttpServer())
      .get('/api/v1/memberships')
      .query({ customerId })
      .set(auth(admin.accessToken));
    const importedMembership = memberships.body.items.find(
      (membership: {
        userId: string;
        communityId: string | null;
        roles: Array<{ key: string }>;
      }) =>
        membership.userId === created.resolvedUserId &&
        membership.communityId === community.body.id,
    );
    expect(importedMembership).toBeTruthy();
    expect(
      importedMembership.roles.map((role: { key: string }) => role.key),
    ).toEqual(['member']);

    const importedReads = await request(app.getHttpServer())
      .get('/api/v1/communities')
      .query({ customerId })
      .set(auth(login.body.accessToken));
    expect(importedReads.status).toBe(200);
    expect(importedReads.body.map((row: { id: string }) => row.id)).toContain(
      community.body.id,
    );
  });

  it('is idempotent for the same external_id in the same customer', async () => {
    const { admin, customerId } = await seededAdmin();
    const csv = 'external_id,email\nSTAFF-1,one@example.com\n';

    const first = await request(app.getHttpServer())
      .post('/api/v1/user-imports')
      .query({ customerId })
      .set(auth(admin.accessToken))
      .attach('file', Buffer.from(csv), 'one.csv');
    await request(app.getHttpServer())
      .post(`/api/v1/user-imports/${first.body.id}/validate`)
      .query({ customerId })
      .set(auth(admin.accessToken));
    await request(app.getHttpServer())
      .post(`/api/v1/user-imports/${first.body.id}/confirm`)
      .query({ customerId })
      .set(auth(admin.accessToken));

    const second = await request(app.getHttpServer())
      .post('/api/v1/user-imports')
      .query({ customerId })
      .set(auth(admin.accessToken))
      .attach('file', Buffer.from(csv), 'two.csv');
    await request(app.getHttpServer())
      .post(`/api/v1/user-imports/${second.body.id}/validate`)
      .query({ customerId })
      .set(auth(admin.accessToken));
    const confirmed = await request(app.getHttpServer())
      .post(`/api/v1/user-imports/${second.body.id}/confirm`)
      .query({ customerId })
      .set(auth(admin.accessToken));

    expect(confirmed.body.counts.matched).toBe(1);
    expect(confirmed.body.counts.created).toBe(0);
  });

  it('accepts a mapping when headers are not canonical', async () => {
    const { admin, customerId } = await seededAdmin();
    const uploaded = await request(app.getHttpServer())
      .post('/api/v1/user-imports')
      .query({ customerId })
      .set(auth(admin.accessToken))
      .attach(
        'file',
        Buffer.from('Email Address,Staff ID\nmap@example.com,S9\n'),
        'mapped.csv',
      );
    expect(uploaded.body.status).toBe('uploaded');

    const mapped = await request(app.getHttpServer())
      .patch(`/api/v1/user-imports/${uploaded.body.id}/mapping`)
      .query({ customerId })
      .set(auth(admin.accessToken))
      .send({ mapping: { email: 'Email Address', externalId: 'Staff ID' } });
    expect(mapped.status).toBe(200);
    expect(mapped.body.status).toBe('mapped');
  });
});
