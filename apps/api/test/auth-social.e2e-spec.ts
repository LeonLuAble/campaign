import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { SOCIAL_TOKEN_VERIFIER } from '../src/modules/auth/application/social-token.verifier.js';
import { CredentialService } from '../src/modules/identity/application/credential.service.js';
import { PasswordHashingService } from '../src/modules/identity/application/password-hashing.service.js';
import { UserCredential } from '../src/modules/identity/domain/user-credential.entity.js';
import {
  IdentityType,
  UserIdentity,
} from '../src/modules/identity/domain/user-identity.entity.js';
import { SocialProvider } from '../src/modules/identity/domain/user-social-identity.entity.js';
import { User } from '../src/modules/identity/domain/user.entity.js';
import {
  clearIdentityData,
  ensureIdentitySchema,
} from './ensure-identity-schema.js';
import { FakeSocialTokenVerifier } from './fake-social-token.verifier.js';

function socialToken(claims: {
  subject: string;
  email?: string | null;
  emailVerified?: boolean;
}): string {
  return JSON.stringify(claims);
}

describe('Auth social (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let credentialService: CredentialService;
  let passwordHashingService: PasswordHashingService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SOCIAL_TOKEN_VERIFIER)
      .useClass(FakeSocialTokenVerifier)
      .compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    await ensureIdentitySchema(dataSource);
    credentialService = app.get(CredentialService);
    passwordHashingService = app.get(PasswordHashingService);
  });

  afterAll(async () => {
    await clearIdentityData(dataSource);
    await app.close();
  });

  beforeEach(async () => {
    await clearIdentityData(dataSource);
  });

  it('creates a user from a verified Google identity and issues tokens', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({
        provider: 'google',
        idToken: socialToken({
          subject: 'google-sub-1',
          email: 'social@example.com',
          emailVerified: true,
        }),
      });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));

    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${response.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.identities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'email',
          identifier: 'social@example.com',
          isVerified: true,
        }),
      ]),
    );

    const socialRows = (await dataSource.query(
      `SELECT provider, provider_subject FROM user_social_identities`,
    )) as Array<{ provider: string; provider_subject: string }>;
    expect(socialRows).toEqual([
      { provider: 'google', provider_subject: 'google-sub-1' },
    ]);
  });

  it('logs in an existing social identity rather than creating another user', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({
        provider: 'google',
        idToken: socialToken({
          subject: 'google-sub-1',
          email: 'social@example.com',
          emailVerified: true,
        }),
      });
    expect(first.status).toBe(200);

    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({
        provider: 'google',
        idToken: socialToken({
          subject: 'google-sub-1',
          email: 'social@example.com',
          emailVerified: true,
        }),
      });
    expect(second.status).toBe(200);

    const firstMe = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${first.body.accessToken}`);
    const secondMe = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${second.body.accessToken}`);
    expect(secondMe.body.id).toBe(firstMe.body.id);

    const users = (await dataSource.query(`SELECT id FROM users`)) as Array<{
      id: string;
    }>;
    expect(users).toHaveLength(1);
  });

  it('links a verified provider email to an existing verified local identity', async () => {
    const userRepository = dataSource.getRepository(User);
    const identityRepository = dataSource.getRepository(UserIdentity);
    const credentialRepository = dataSource.getRepository(UserCredential);

    const localUser = await userRepository.save(
      userRepository.create({ is_active: true }),
    );
    await identityRepository.save(
      identityRepository.create({
        user_id: localUser.id,
        type: IdentityType.EMAIL,
        identifier: 'linked@example.com',
        normalized_identifier:
          credentialService.normalizeEmail('linked@example.com'),
        is_verified: true,
        verified_at: new Date(),
      }),
    );
    await credentialRepository.save(
      credentialRepository.create({
        user_id: localUser.id,
        password_hash: await passwordHashingService.hash('password123'),
      }),
    );

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({
        provider: 'apple',
        idToken: socialToken({
          subject: 'apple-sub-1',
          email: 'linked@example.com',
          emailVerified: true,
        }),
      });

    expect(response.status).toBe(200);
    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${response.body.accessToken}`);
    expect(me.body.id).toBe(localUser.id);

    const socialRows = (await dataSource.query(
      `SELECT user_id, provider FROM user_social_identities`,
    )) as Array<{ user_id: string; provider: string }>;
    expect(socialRows).toEqual([
      { user_id: localUser.id, provider: SocialProvider.APPLE },
    ]);
  });

  it('does not auto-link to an unverified local email identity', async () => {
    const userRepository = dataSource.getRepository(User);
    const identityRepository = dataSource.getRepository(UserIdentity);

    const unverified = await userRepository.save(
      userRepository.create({ is_active: true }),
    );
    await identityRepository.save(
      identityRepository.create({
        user_id: unverified.id,
        type: IdentityType.EMAIL,
        identifier: 'pending@example.com',
        normalized_identifier: credentialService.normalizeEmail(
          'pending@example.com',
        ),
        is_verified: false,
        verified_at: null,
      }),
    );

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({
        provider: 'google',
        idToken: socialToken({
          subject: 'google-sub-pending',
          email: 'pending@example.com',
          emailVerified: true,
        }),
      });

    expect(response.status).toBe(200);
    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${response.body.accessToken}`);
    expect(me.body.id).not.toBe(unverified.id);
    expect(me.body.identities).toEqual([]);

    const identities = (await dataSource.query(
      `SELECT user_id, is_verified FROM user_identities WHERE normalized_identifier = $1`,
      ['pending@example.com'],
    )) as Array<{ user_id: string; is_verified: boolean }>;
    expect(identities).toEqual([
      { user_id: unverified.id, is_verified: false },
    ]);
  });

  it('returns SOCIAL_TOKEN_INVALID for a malformed ID token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({
        provider: 'google',
        idToken: 'not-a-json-token',
      });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('SOCIAL_TOKEN_INVALID');
  });

  it('returns INVALID_CREDENTIALS for an inactive linked user', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({
        provider: 'google',
        idToken: socialToken({
          subject: 'google-inactive',
          email: 'inactive@example.com',
          emailVerified: true,
        }),
      });
    expect(first.status).toBe(200);

    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${first.body.accessToken}`);
    await dataSource.query(`UPDATE users SET is_active = false WHERE id = $1`, [
      me.body.id,
    ]);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({
        provider: 'google',
        idToken: socialToken({
          subject: 'google-inactive',
          email: 'inactive@example.com',
          emailVerified: true,
        }),
      });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns VALIDATION_FAILED for an unknown provider', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({
        provider: 'facebook',
        idToken: socialToken({ subject: 'x' }),
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });
});
