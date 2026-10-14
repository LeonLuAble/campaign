import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { SetupService } from './application/setup.service.js';
import { SetupController } from './presentation/setup.controller.js';

@Module({
  imports: [ConfigModule, IdentityModule, AuthModule],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}
