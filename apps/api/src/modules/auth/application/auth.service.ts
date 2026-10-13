import { Injectable } from '@nestjs/common';
import {
  CredentialService,
  InvalidPhoneNumberError,
} from '../../identity/application/credential.service.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import type { PublicUserProfile } from '../../identity/application/identity-account.service.js';
import { DUMMY_PASSWORD_HASH } from '../../identity/application/password-hashing.service.js';
import { IdentityType } from '../../identity/domain/user-identity.entity.js';
import { InvalidCredentialsException } from './auth.exceptions.js';
import { TokenPair, TokenService } from './token.service.js';

export type UserProfile = PublicUserProfile;

@Injectable()
export class AuthService {
  constructor(
    private readonly identityAccountService: IdentityAccountService,
    private readonly credentialService: CredentialService,
    private readonly tokenService: TokenService,
  ) {}

  async login(identifier: string, password: string): Promise<TokenPair> {
    const type = this.credentialService.detectIdentifierType(identifier);
    let normalizedIdentifier: string;

    try {
      normalizedIdentifier =
        this.credentialService.normalizeIdentifier(identifier);
    } catch (error) {
      if (error instanceof InvalidPhoneNumberError) {
        await this.credentialService.verifyDummyPassword(password);
        throw new InvalidCredentialsException();
      }
      throw error;
    }

    const candidate = await this.identityAccountService.findLoginCandidate(
      type as IdentityType,
      normalizedIdentifier,
    );
    const passwordHash = candidate
      ? await this.identityAccountService.getPasswordHash(candidate.userId)
      : null;
    const eligible = Boolean(
      candidate?.isVerified && candidate.isActive && passwordHash,
    );
    const verified = await this.credentialService.verifyPassword(
      eligible && passwordHash ? passwordHash : DUMMY_PASSWORD_HASH,
      password,
    );

    if (!eligible || !verified) {
      throw new InvalidCredentialsException();
    }

    return this.tokenService.createRefreshToken(candidate!.userId);
  }

  async logout(refreshToken: string, revokeFamily = false): Promise<void> {
    const token = await this.tokenService.findByRawToken(refreshToken);
    if (!token) {
      return;
    }

    if (revokeFamily) {
      await this.tokenService.revokeFamilyTokens(token.familyId, 'USER_LOGOUT');
      return;
    }

    await this.tokenService.revokeRefreshToken(refreshToken, 'USER_LOGOUT');
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    const profile = await this.identityAccountService.getProfile(userId);
    if (!profile) {
      throw new InvalidCredentialsException();
    }
    return profile;
  }
}
