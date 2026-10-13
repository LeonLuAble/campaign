import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { hashOneTimeToken } from '../src/modules/auth/application/one-time-token.js';
import { DevNotificationSender } from '../src/modules/auth/infrastructure/dev-notification.sender.js';
import { UserTokenType } from '../src/modules/identity/domain/user-token.entity.js';
import {
  clearIdentityData,
  ensureIdentitySchema,
} from './ensure-identity-schema.js';

describe('Auth account lifecycle (e2e)', () => {
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

  async function register(
    identifier = 'newbie@example.com',
    password = 'password123',
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ identifier, password });
    return response;
  }

  function lastToken(template: 'activation' | 'password_reset' = 'activation') {
    const messages = notifications
      .drain()
      .filter((message) => message.template === template);
    return messages.at(-1)?.token;
  }

  it('registers, activates, then logs in', async () => {
    const registerResponse = await register();
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).toMatchObject({
      identifier: 'newbie@example.com',
      type: 'email',
    });
    expect(registerResponse.body.id).toEqual(expect.any(String));

    const beforeActivate = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: 'newbie@example.com',
        password: 'password123',
      });
    expect(beforeActivate.status).toBe(401);
    expect(beforeActivate.body.code).toBe('INVALID_CREDENTIALS');

    const token = lastToken();
    expect(token).toEqual(expect.any(String));

    const hashes = (await dataSource.query(
      `SELECT token_hash FROM user_tokens WHERE type = 'activation'`,
    )) as Array<{ token_hash: string }>;
    expect(hashes).toHaveLength(1);
    expect(hashes[0].token_hash).toBe(hashOneTimeToken(token!));
    expect(hashes[0].token_hash).not.toBe(token);

    const activateResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token });
    expect(activateResponse.status).toBe(204);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: 'newbie@example.com',
        password: 'password123',
      });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.accessToken).toEqual(expect.any(String));
  });

  it('registers a mobile identity and activates it', async () => {
    const registerResponse = await register('0123456789', 'password123');
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.type).toBe('mobile');

    const token = lastToken();
    const activateResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token });
    expect(activateResponse.status).toBe(204);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: '0123456789',
        password: 'password123',
      });
    expect(loginResponse.status).toBe(200);
  });

  it('is idempotent when activating an already-verified token', async () => {
    await register();
    const token = lastToken();

    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token })
      .expect(204);

    const again = await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token });
    expect(again.status).toBe(204);
  });

  it('rejects activation after expiry', async () => {
    const registerResponse = await register();
    const token = lastToken();

    await dataSource.query(
      `UPDATE user_tokens SET expires_at = NOW() - INTERVAL '1 minute' WHERE user_id = $1`,
      [registerResponse.body.id],
    );

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('TOKEN_EXPIRED');
  });

  it('activates a token that has not expired', async () => {
    await register();
    const token = lastToken();

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token });

    expect(response.status).toBe(204);
  });

  it('rejects a superseded activation token after resend', async () => {
    await register();
    const firstToken = lastToken();

    const resend = await request(app.getHttpServer())
      .post('/api/v1/auth/activate/resend')
      .send({ identifier: 'newbie@example.com' });
    expect(resend.status).toBe(202);
    expect(resend.body).toEqual({ accepted: true });

    const unused = (await dataSource.query(
      `SELECT used_at FROM user_tokens WHERE type = 'activation' ORDER BY created_at ASC`,
    )) as Array<{ used_at: Date | string | null }>;
    expect(unused).toHaveLength(2);
    expect(unused[0].used_at).not.toBeNull();
    expect(unused[1].used_at).toBeNull();

    const secondToken = lastToken();
    expect(secondToken).toBeDefined();
    expect(secondToken).not.toBe(firstToken);

    const superseded = await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: firstToken });
    expect(superseded.status).toBe(400);
    expect(superseded.body.code).toBe('TOKEN_INVALID');

    const activate = await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: secondToken });
    expect(activate.status).toBe(204);
  });

  it('stores identity_id on activation tokens and verifies only that identity', async () => {
    const registered = await register();
    expect(registered.status).toBe(201);

    const identities = (await dataSource.query(
      `SELECT id FROM user_identities WHERE user_id = $1`,
      [registered.body.id],
    )) as Array<{ id: string }>;
    expect(identities).toHaveLength(1);

    await dataSource.query(
      `INSERT INTO user_identities (user_id, type, identifier, normalized_identifier, is_verified)
       VALUES ($1, 'mobile', '+60123456789', '+60123456789', false)`,
      [registered.body.id],
    );

    const tokenRows = (await dataSource.query(
      `SELECT identity_id FROM user_tokens WHERE type = 'activation' AND used_at IS NULL`,
    )) as Array<{ identity_id: string | null }>;
    expect(tokenRows).toHaveLength(1);
    expect(tokenRows[0].identity_id).toBe(identities[0].id);

    const token = lastToken();
    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token })
      .expect(204);

    const after = (await dataSource.query(
      `SELECT type, is_verified FROM user_identities WHERE user_id = $1 ORDER BY type`,
      [registered.body.id],
    )) as Array<{ type: string; is_verified: boolean }>;
    expect(after).toEqual([
      { type: 'email', is_verified: true },
      { type: 'mobile', is_verified: false },
    ]);
  });

  it('returns IDENTITY_ALREADY_EXISTS when the identifier is taken', async () => {
    await register();
    const again = await register();
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('IDENTITY_ALREADY_EXISTS');
  });

  it('returns WEAK_PASSWORD for a short password', async () => {
    const response = await register('weak@example.com', 'short');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('WEAK_PASSWORD');
  });

  it('returns TOKEN_INVALID for an unknown activation token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: 'a'.repeat(64) });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('TOKEN_INVALID');
  });

  it('resets a password, revokes sessions, and rejects token reuse', async () => {
    await register();
    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: lastToken() })
      .expect(204);

    const firstLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: 'newbie@example.com',
        password: 'password123',
      });
    expect(firstLogin.status).toBe(200);
    const { refreshToken } = firstLogin.body as { refreshToken: string };

    const unknownRequest = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({ identifier: 'missing@example.com' });
    const knownRequest = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/request')
      .send({ identifier: 'newbie@example.com' });

    expect(unknownRequest.status).toBe(202);
    expect(unknownRequest.body).toEqual({ accepted: true });
    expect(knownRequest.status).toBe(202);
    expect(knownRequest.body).toEqual({ accepted: true });
    expect(Object.keys(unknownRequest.body).sort()).toEqual(
      Object.keys(knownRequest.body).sort(),
    );

    const resetToken = lastToken('password_reset');
    expect(resetToken).toEqual(expect.any(String));

    const confirm = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: resetToken, password: 'newPassword1' });
    expect(confirm.status).toBe(204);

    const revoked = (await dataSource.query(
      `SELECT revoked_at, revocation_reason FROM refresh_tokens`,
    )) as Array<{
      revoked_at: Date | string | null;
      revocation_reason: string;
    }>;
    expect(revoked.length).toBeGreaterThan(0);
    expect(revoked.every((row) => row.revoked_at !== null)).toBe(true);
    expect(
      revoked.every((row) => row.revocation_reason === 'PASSWORD_RESET'),
    ).toBe(true);

    const staleRefresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(staleRefresh.status).toBe(401);

    const oldPassword = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: 'newbie@example.com',
        password: 'password123',
      });
    expect(oldPassword.status).toBe(401);

    const newPassword = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: 'newbie@example.com',
        password: 'newPassword1',
      });
    expect(newPassword.status).toBe(200);

    const reused = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token: resetToken, password: 'anotherPass1' });
    expect(reused.status).toBe(400);
    expect(reused.body.code).toBe('TOKEN_INVALID');
  });

  it('returns the same password-reset request response for unknown identifiers', async () => {
    const existing = await register('known@example.com');
    expect(existing.status).toBe(201);
    await request(app.getHttpServer())
      .post('/api/v1/auth/activate')
      .send({ token: lastToken() })
      .expect(204);

    const [unknown, known] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/request')
        .send({ identifier: 'ghost@example.com' }),
      request(app.getHttpServer())
        .post('/api/v1/auth/password-reset/request')
        .send({ identifier: 'known@example.com' }),
    ]);

    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
    expect(unknown.body).toEqual({ accepted: true });
  });

  it('keeps a single unused activation token per user after resend', async () => {
    const registered = await register();
    await request(app.getHttpServer())
      .post('/api/v1/auth/activate/resend')
      .send({ identifier: 'newbie@example.com' })
      .expect(202);

    const unused = (await dataSource.query(
      `SELECT id FROM user_tokens
       WHERE user_id = $1 AND type = $2 AND used_at IS NULL`,
      [registered.body.id, UserTokenType.ACTIVATION],
    )) as Array<{ id: string }>;
    expect(unused).toHaveLength(1);
  });
});
