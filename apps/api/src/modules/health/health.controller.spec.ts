import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configureApp } from '../../bootstrap/configure-app.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getLiveness: () => ({
              status: 'ok',
              timestamp: '2026-01-01T00:00:00.000Z',
            }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns liveness', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('returns the shared error shape for unknown routes', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/missing')
      .set('x-request-id', 'test-correlation');

    expect(response.status).toBe(404);
    expect(response.headers['x-request-id']).toBe('test-correlation');
    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      correlationId: 'test-correlation',
      path: '/api/v1/missing',
    });
    expect(typeof response.body.timestamp).toBe('string');
    expect(typeof response.body.message).toBe('string');
  });
});
