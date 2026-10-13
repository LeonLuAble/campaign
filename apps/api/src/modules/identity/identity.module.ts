import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialService } from './application/credential.service.js';
import { IdentityAccountService } from './application/identity-account.service.js';
import { PasswordHashingService } from './application/password-hashing.service.js';
import { RefreshTokenService } from './application/refresh-token.service.js';
import { RefreshToken } from './domain/refresh-token.entity.js';
import { UserCredential } from './domain/user-credential.entity.js';
import { UserIdentity } from './domain/user-identity.entity.js';
import { UserSocialIdentity } from './domain/user-social-identity.entity.js';
import { UserToken } from './domain/user-token.entity.js';
import { User } from './domain/user.entity.js';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      User,
      UserIdentity,
      UserCredential,
      UserSocialIdentity,
      RefreshToken,
      UserToken,
    ]),
  ],
  providers: [
    PasswordHashingService,
    CredentialService,
    IdentityAccountService,
    RefreshTokenService,
  ],
  exports: [
    PasswordHashingService,
    CredentialService,
    IdentityAccountService,
    RefreshTokenService,
  ],
})
export class IdentityModule {}
