import { Logger } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RedisService } from '../../platform/redis/redis.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  it('reports liveness without checking infrastructure', () => {
    const service = new HealthService({} as DataSource, {} as RedisService);

    const result = service.getLiveness();

    expect(result.status).toBe('ok');
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it('reports ok readiness when all dependencies are up', async () => {
    const dataSource = {
      query: vi.fn().mockResolvedValue([{ result: 1 }]),
    } as unknown as DataSource;
    const redis = {
      ping: vi.fn().mockResolvedValue(true),
    } as unknown as RedisService;
    const service = new HealthService(dataSource, redis);

    const result = await service.getReadiness();

    expect(result.status).toBe('ok');
    expect(result.checks).toEqual({ database: 'up', redis: 'up' });
  });

  it('reports degraded readiness when PostgreSQL is unavailable', async () => {
    const dataSource = {
      query: vi.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as DataSource;
    const redis = {
      ping: vi.fn().mockResolvedValue(true),
    } as unknown as RedisService;
    const service = new HealthService(dataSource, redis);

    const result = await service.getReadiness();

    expect(result.status).toBe('degraded');
    expect(result.checks).toEqual({ database: 'down', redis: 'up' });
  });

  it('reports degraded readiness when Redis is unavailable', async () => {
    const dataSource = {
      query: vi.fn().mockResolvedValue([{ result: 1 }]),
    } as unknown as DataSource;
    const redis = {
      ping: vi.fn().mockResolvedValue(false),
    } as unknown as RedisService;
    const service = new HealthService(dataSource, redis);

    const result = await service.getReadiness();

    expect(result.status).toBe('degraded');
    expect(result.checks).toEqual({ database: 'up', redis: 'down' });
  });

  it('reports degraded readiness when both dependencies are unavailable', async () => {
    const dataSource = {
      query: vi.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as DataSource;
    const redis = {
      ping: vi.fn().mockResolvedValue(false),
    } as unknown as RedisService;
    const service = new HealthService(dataSource, redis);

    const result = await service.getReadiness();

    expect(result.status).toBe('degraded');
    expect(result.checks).toEqual({ database: 'down', redis: 'down' });
  });
});
