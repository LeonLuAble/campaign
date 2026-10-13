import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../../platform/redis/redis.service.js';
import type {
  DependencyStatus,
  LivenessResponse,
  ReadinessResponse,
} from './health.types.js';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  getLiveness(): LivenessResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<ReadinessResponse> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);
    const status = database === 'up' && redis === 'up' ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: { database, redis },
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch {
      this.logger.warn('Database readiness check failed');
      return 'down';
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    const isUp = await this.redisService.ping();
    if (!isUp) {
      this.logger.warn('Redis readiness check failed');
    }

    return isUp ? 'up' : 'down';
  }
}
