import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap/configure-app.js';
import { RedisService } from '../src/platform/redis/redis.service.js';

describe('Health (e2e)', () => {
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

  it('GET /api/v1/health returns process liveness', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it('GET /api/v1/health/ready reports PostgreSQL and Redis', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/health/ready',
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      checks: {
        database: 'up',
        redis: 'up',
      },
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toContain('postgresql://');
    expect(JSON.stringify(response.body)).not.toContain('redis://');
  });
});

describe('Health readiness degraded (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const failingDataSource = {
      query: vi.fn().mockRejectedValue(new Error('Connection refused')),
      entityMetadatas: [],
      options: { entities: [] },
      getRepository: vi.fn().mockReturnValue({
        metadata: {
          tableName: 'mock_table',
        },
      }),
    } as unknown as DataSource;

    const failingRedisService = {
      ping: vi.fn().mockResolvedValue(false),
    } as unknown as RedisService;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(failingDataSource)
      .overrideProvider(RedisService)
      .useValue(failingRedisService)
      .compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health/ready returns 503 when dependencies are down', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/health/ready',
    );

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.checks).toMatchObject({
      database: 'down',
      redis: 'down',
    });

    const responseText = JSON.stringify(response.body);
    expect(responseText).not.toContain('postgresql://');
    expect(responseText).not.toContain('redis://');
    expect(responseText).not.toContain('localhost');
    expect(responseText).not.toContain('5432');
    expect(responseText).not.toContain('6379');
    expect(responseText).not.toContain('Connection refused');
  });
});
