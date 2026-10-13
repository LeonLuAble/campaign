import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/user.entity.js';
import { UserIdentity } from './domain/user-identity.entity.js';
import { UserCredential } from './domain/user-credential.entity.js';
import { UserSocialIdentity } from './domain/user-social-identity.entity.js';
import { RefreshToken } from './domain/refresh-token.entity.js';
import { UserToken } from './domain/user-token.entity.js';
import { PasswordHashingService } from './application/password-hashing.service.js';
import { CredentialService } from './application/credential.service.js';

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
  providers: [PasswordHashingService, CredentialService],
  exports: [PasswordHashingService, CredentialService],
})
export class IdentityModule {}
