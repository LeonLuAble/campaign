import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';

describe('Error Handling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 404 with machine-readable error code for unknown routes', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/nonexistent',
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      error: 'Not Found',
      path: '/api/v1/nonexistent',
    });
    expect(response.body.correlationId).toEqual(expect.any(String));
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(response.body.message).toEqual(expect.any(String));
  });

  it('echoes x-request-id in error responses', async () => {
    const requestId = 'test-request-123';
    const response = await request(app.getHttpServer())
      .get('/api/v1/nonexistent')
      .set('x-request-id', requestId);

    expect(response.status).toBe(404);
    expect(response.body.correlationId).toBe(requestId);
    expect(response.headers['x-request-id']).toBe(requestId);
  });
});
