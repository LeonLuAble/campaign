import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { createLoggerParams } from './bootstrap/logger.config.js';
import { AppConfigModule } from './config/app-config.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AuthorizationModule } from './modules/authorization/authorization.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { CommunitiesModule } from './modules/communities/communities.module.js';
import { MembershipsModule } from './modules/memberships/memberships.module.js';
import { UserImportsModule } from './modules/user-imports/user-imports.module.js';
import { CampaignsModule } from './modules/campaigns/campaigns.module.js';
import { ParticipationModule } from './modules/participation/participation.module.js';
import { DatabaseModule } from './platform/database/database.module.js';
import { RedisModule } from './platform/redis/redis.module.js';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createLoggerParams(config),
    }),
    DatabaseModule,
    RedisModule,
    HealthModule,
    IdentityModule,
    AuthModule,
    CustomersModule,
    CommunitiesModule,
    MembershipsModule,
    UserImportsModule,
    CampaignsModule,
    ParticipationModule,
    AuthorizationModule,
  ],
})
export class AppModule {}
