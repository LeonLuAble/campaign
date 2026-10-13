import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { IdentityModule } from '../identity/identity.module.js';
import { AuthService } from './application/auth.service.js';
import { JwtStrategy } from './application/jwt.strategy.js';
import { NOTIFICATION_SENDER } from './application/notification-sender.js';
import { PasswordResetService } from './application/password-reset.service.js';
import { RegistrationService } from './application/registration.service.js';
import { TokenService } from './application/token.service.js';
import { DevNotificationSender } from './infrastructure/dev-notification.sender.js';
import { AuthController } from './presentation/auth.controller.js';
import { JwtAuthGuard } from './presentation/jwt-auth.guard.js';
import { MeController } from './presentation/me.controller.js';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    IdentityModule,
  ],
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    JwtAuthGuard,
    RegistrationService,
    PasswordResetService,
    DevNotificationSender,
    { provide: NOTIFICATION_SENDER, useExisting: DevNotificationSender },
  ],
  exports: [AuthService, TokenService, JwtAuthGuard, DevNotificationSender],
})
export class AuthModule {}
