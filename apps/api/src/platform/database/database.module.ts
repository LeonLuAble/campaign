import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDatabaseOptions } from './database-options.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...createDatabaseOptions(config.getOrThrow<string>('database.url')),
        autoLoadEntities: true,
        retryAttempts: 2,
        retryDelay: 1000,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
