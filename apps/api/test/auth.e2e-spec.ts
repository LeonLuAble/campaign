import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { CredentialService } from '../src/modules/identity/application/credential.service.js';
import { PasswordHashingService } from '../src/modules/identity/application/password-hashing.service.js';
import { UserCredential } from '../src/modules/identity/domain/user-credential.entity.js';
import {
  IdentityType,
  UserIdentity,
} from '../src/modules/identity/domain/user-identity.entity.js';
import { User } from '../src/modules/identity/domain/user.entity.js';
import {
  clearIdentityData,
  ensureIdentitySchema,
} from './ensure-identity-schema.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let passwordHashingService: PasswordHashingService;
  let credentialService: CredentialService;
  let testUser: User;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    await ensureIdentitySchema(dataSource);
    passwordHashingService = app.get(PasswordHashingService);
    credentialService = app.get(CredentialService);
  });

  afterAll(async () => {
    await clearIdentityData(dataSource);
    await app.close();
  });

  beforeEach(async () => {
    await clearIdentityData(dataSource);

    const userRepository = dataSource.getRepository(User);
    const identityRepository = dataSource.getRepository(UserIdentity);
    const credentialRepository = dataSource.getRepository(UserCredential);

    testUser = await userRepository.save(
      userRepository.create({
        first_name: 'Test',
        last_name: 'User',
        display_name: 'Test User',
        locale: 'en',
        timezone: 'UTC',
        is_active: true,
      }),
    );

    await identityRepository.save(
      identityRepository.create({
        user_id: testUser.id,
        type: IdentityType.EMAIL,
        identifier: 'test@example.com',
        normalized_identifier:
          credentialService.normalizeEmail('test@example.com'),
        is_verified: true,
        verified_at: new Date(),
      }),
    );

    await credentialRepository.save(
      credentialRepository.create({
        user_id: testUser.id,
        password_hash: await passwordHashingService.hash('password123'),
      }),
    );
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in with email and password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.refreshToken).toEqual(expect.any(String));
    });

    it('normalizes email case before lookup', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'TEST@EXAMPLE.COM',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toEqual(expect.any(String));
    });

    it('logs in with a mobile number', async () => {
      const identityRepository = dataSource.getRepository(UserIdentity);
      await identityRepository.save(
        identityRepository.create({
          user_id: testUser.id,
          type: IdentityType.MOBILE,
          identifier: '+60123456789',
          normalized_identifier:
            credentialService.normalizeMobile('+60123456789'),
          is_verified: true,
          verified_at: new Date(),
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: '+60123456789',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toEqual(expect.any(String));
    });

    it('returns INVALID_CREDENTIALS for a wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('returns INVALID_CREDENTIALS for an unknown identifier', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'missing@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns INVALID_CREDENTIALS for an unverified identity', async () => {
      const userRepository = dataSource.getRepository(User);
      const identityRepository = dataSource.getRepository(UserIdentity);
      const credentialRepository = dataSource.getRepository(UserCredential);

      const unverifiedUser = await userRepository.save(
        userRepository.create({
          first_name: 'Unverified',
          last_name: 'User',
          is_active: true,
        }),
      );

      await identityRepository.save(
        identityRepository.create({
          user_id: unverifiedUser.id,
          type: IdentityType.EMAIL,
          identifier: 'unverified@example.com',
          normalized_identifier: credentialService.normalizeEmail(
            'unverified@example.com',
          ),
          is_verified: false,
          verified_at: null,
        }),
      );

      await credentialRepository.save(
        credentialRepository.create({
          user_id: unverifiedUser.id,
          password_hash: await passwordHashingService.hash('password123'),
        }),
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'unverified@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns INVALID_CREDENTIALS for an inactive user', async () => {
      const userRepository = dataSource.getRepository(User);
      testUser.is_active = false;
      await userRepository.save(testUser);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns VALIDATION_FAILED for an incomplete login DTO', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('returns VALIDATION_FAILED for a short password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(
        (response.body.message as string[]).some((message) =>
          message.toLowerCase().includes('password'),
        ),
      ).toBe(true);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('rotates a valid refresh token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'password123',
        });

      const { refreshToken } = loginResponse.body as {
        refreshToken: string;
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.refreshToken).toEqual(expect.any(String));
      expect(response.body.refreshToken).not.toBe(refreshToken);
    });

    it('returns TOKEN_INVALID for an unknown refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('TOKEN_INVALID');
    });

    it('returns TOKEN_REUSED when a rotated token is presented again', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'password123',
        });

      const { refreshToken } = loginResponse.body as {
        refreshToken: string;
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const reuseResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(reuseResponse.status).toBe(401);
      expect(reuseResponse.body.code).toBe('TOKEN_REUSED');
    });

    it('revokes the rest of the family after reuse is detected', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'password123',
        });

      const { refreshToken: token1 } = loginResponse.body as {
        refreshToken: string;
      };

      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: token1 });

      const { refreshToken: token2 } = refreshResponse.body as {
        refreshToken: string;
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: token1 })
        .expect(401);

      const familyResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: token2 });

      expect(familyResponse.status).toBe(401);
      expect(familyResponse.body.code).toBe('TOKEN_REUSED');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('revokes the presented refresh token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'password123',
        });

      const { refreshToken } = loginResponse.body as {
        refreshToken: string;
      };

      const logoutResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken });

      expect(logoutResponse.status).toBe(204);

      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.code).toBe('TOKEN_REUSED');
    });

    it('revokes the token family when requested', async () => {
      const firstLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'password123',
        });

      const { refreshToken: token1 } = firstLogin.body as {
        refreshToken: string;
      };

      const rotated = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: token1 });

      const { refreshToken: token2 } = rotated.body as {
        refreshToken: string;
      };

      const logoutResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: token2, revokeFamily: true });

      expect(logoutResponse.status).toBe(204);

      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: token2 });

      expect(refreshResponse.status).toBe(401);
      expect(refreshResponse.body.code).toBe('TOKEN_REUSED');
    });

    it('returns 204 for an unknown refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'non-existent-token' });

      expect(response.status).toBe(204);
    });

    it('returns VALIDATION_FAILED when refreshToken is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('GET /api/v1/me', () => {
    it('returns the user profile without credential hashes', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          identifier: 'test@example.com',
          password: 'password123',
        });

      const { accessToken } = loginResponse.body as { accessToken: string };

      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: testUser.id,
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User',
        isActive: true,
      });
      expect(response.body.identities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'email',
            identifier: 'test@example.com',
            isVerified: true,
          }),
        ]),
      );
      expect(JSON.stringify(response.body)).not.toContain('password_hash');
      expect(JSON.stringify(response.body)).not.toContain(
        'normalized_identifier',
      );
    });

    it('rejects a request without an access token', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/me');

      expect(response.status).toBe(401);
    });

    it('rejects a request with an invalid access token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});
