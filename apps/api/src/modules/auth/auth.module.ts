import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from '../identity/identity.module.js';
import { UserCredential } from '../identity/domain/user-credential.entity.js';
import { UserIdentity } from '../identity/domain/user-identity.entity.js';
import { User } from '../identity/domain/user.entity.js';
import { RefreshToken } from '../identity/domain/refresh-token.entity.js';
import { AuthService } from './application/auth.service.js';
import { JwtStrategy } from './application/jwt.strategy.js';
import { TokenService } from './application/token.service.js';
import { AuthController } from './presentation/auth.controller.js';
import { JwtAuthGuard } from './presentation/jwt-auth.guard.js';
import { MeController } from './presentation/me.controller.js';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      User,
      UserIdentity,
      UserCredential,
      RefreshToken,
    ]),
    IdentityModule,
  ],
  controllers: [AuthController, MeController],
  providers: [AuthService, TokenService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, TokenService, JwtAuthGuard],
})
export class AuthModule {}
