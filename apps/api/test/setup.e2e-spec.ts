import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { SetupService } from '../src/modules/setup/application/setup.service.js';
import {
  clearIdentityData,
  ensureIdentitySchema,
} from './ensure-identity-schema.js';

const SETUP_KEY = `setup-e2e-key-${'x'.repeat(20)}`;

describe('Setup (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let setupService: SetupService;

  beforeAll(async () => {
    process.env.SETUP_KEY = SETUP_KEY;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();

    dataSource = app.get(DataSource);
    setupService = app.get(SetupService);
    await ensureIdentitySchema(dataSource);
  });

  afterAll(async () => {
    await clearIdentityData(dataSource);
    await app.close();
    delete process.env.SETUP_KEY;
  });

  beforeEach(async () => {
    setupService.resetPlatformAdminCache();
    await clearIdentityData(dataSource);
  });

  it('GET /setup/status is true when no platform admin exists', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/setup/status',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ setupRequired: true });
  });

  it('creates the first platform admin and returns a token pair', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/setup/admin')
      .send({
        setupKey: SETUP_KEY,
        email: 'first.admin@example.test',
        password: 'SetupPassw0rd!',
        displayName: 'First Admin',
      });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));

    const status = await request(app.getHttpServer()).get(
      '/api/v1/setup/status',
    );
    expect(status.body).toEqual({ setupRequired: false });
  });

  it('rejects a second setup attempt', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/setup/admin')
      .send({
        setupKey: SETUP_KEY,
        email: 'first.admin@example.test',
        password: 'SetupPassw0rd!',
      })
      .expect(200);

    const second = await request(app.getHttpServer())
      .post('/api/v1/setup/admin')
      .send({
        setupKey: SETUP_KEY,
        email: 'second.admin@example.test',
        password: 'SetupPassw0rd!',
      });

    expect(second.status).toBe(409);
    expect(second.body.code).toBe('SETUP_NOT_AVAILABLE');
  });

  it('rejects an invalid setup key', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/setup/admin')
      .send({
        setupKey: 'y'.repeat(SETUP_KEY.length),
        email: 'first.admin@example.test',
        password: 'SetupPassw0rd!',
      });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_SETUP_KEY');
  });

  it('allows exactly one concurrent setup to succeed', async () => {
    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/setup/admin')
        .send({
          setupKey: SETUP_KEY,
          email: 'race.one@example.test',
          password: 'SetupPassw0rd!',
        }),
      request(app.getHttpServer())
        .post('/api/v1/setup/admin')
        .send({
          setupKey: SETUP_KEY,
          email: 'race.two@example.test',
          password: 'SetupPassw0rd!',
        }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 409]);

    const winner = first.status === 200 ? first : second;
    expect(winner.body.accessToken).toEqual(expect.any(String));

    const status = await request(app.getHttpServer()).get(
      '/api/v1/setup/status',
    );
    expect(status.body).toEqual({ setupRequired: false });
  });
});
