import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('redis.url'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 5_000,
      retryStrategy: () => null,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    const response = await this.client.ping();
    if (response !== 'PONG') {
      throw new Error('Redis did not respond to ping');
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client.status === 'ready' || this.client.status === 'connect') {
      await this.client.quit();
      return;
    }

    this.client.disconnect();
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
