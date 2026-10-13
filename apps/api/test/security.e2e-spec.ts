import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';

describe('Security hardening (e2e)', () => {
  let app: INestApplication;
  const previous = {
    enabled: process.env.AUTH_RATE_LIMIT_ENABLED,
    max: process.env.AUTH_RATE_LIMIT_MAX,
    cors: process.env.CORS_ORIGINS,
  };

  beforeAll(async () => {
    process.env.AUTH_RATE_LIMIT_ENABLED = 'true';
    process.env.AUTH_RATE_LIMIT_MAX = '3';
    process.env.CORS_ORIGINS = 'http://localhost:4173';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    if (previous.enabled === undefined) {
      delete process.env.AUTH_RATE_LIMIT_ENABLED;
    } else {
      process.env.AUTH_RATE_LIMIT_ENABLED = previous.enabled;
    }
    if (previous.max === undefined) {
      delete process.env.AUTH_RATE_LIMIT_MAX;
    } else {
      process.env.AUTH_RATE_LIMIT_MAX = previous.max;
    }
    if (previous.cors === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = previous.cors;
    }
    await app.close();
  });

  it('sets Helmet headers and CORS from env', async () => {
    const health = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:4173');
    expect(health.status).toBe(200);
    expect(health.headers['x-content-type-options']).toBe('nosniff');
    expect(health.headers['x-powered-by']).toBeUndefined();
    expect(health.headers['access-control-allow-origin']).toBe(
      'http://localhost:4173',
    );

    const rejected = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'http://evil.example');
    expect(rejected.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rate limits auth login after the configured maximum', async () => {
    const payload = {
      identifier: 'nobody@example.test',
      password: 'wrong-password',
    };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(payload);
      expect(response.status).toBe(401);
    }

    const limited = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(payload);
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('RATE_LIMITED');
  });
});
