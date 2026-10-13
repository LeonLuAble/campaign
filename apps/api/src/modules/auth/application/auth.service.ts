import { Inject, Injectable } from '@nestjs/common';
import {
  CredentialService,
  InvalidPhoneNumberError,
} from '../../identity/application/credential.service.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import type { PublicUserProfile } from '../../identity/application/identity-account.service.js';
import { DUMMY_PASSWORD_HASH } from '../../identity/application/password-hashing.service.js';
import { IdentityType } from '../../identity/domain/user-identity.entity.js';
import { SocialProvider } from '../../identity/domain/user-social-identity.entity.js';
import {
  InvalidCredentialsException,
  SocialTokenInvalidException,
} from './auth.exceptions.js';
import {
  SOCIAL_TOKEN_VERIFIER,
  type SocialTokenVerifier,
} from './social-token.verifier.js';
import { TokenPair, TokenService } from './token.service.js';

export type UserProfile = PublicUserProfile;

@Injectable()
export class AuthService {
  constructor(
    private readonly identityAccountService: IdentityAccountService,
    private readonly credentialService: CredentialService,
    private readonly tokenService: TokenService,
    @Inject(SOCIAL_TOKEN_VERIFIER)
    private readonly socialTokenVerifier: SocialTokenVerifier,
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

  async socialLogin(
    provider: SocialProvider,
    idToken: string,
  ): Promise<TokenPair> {
    let claims;
    try {
      claims = await this.socialTokenVerifier.verify(provider, idToken);
    } catch (error) {
      if (error instanceof SocialTokenInvalidException) {
        throw error;
      }
      throw new SocialTokenInvalidException();
    }

    const trimmedEmail = claims.email?.trim() ? claims.email.trim() : null;
    const normalizedEmail = trimmedEmail
      ? this.credentialService.normalizeEmail(trimmedEmail)
      : null;

    const account = await this.identityAccountService.resolveSocialAccount({
      provider: claims.provider,
      subject: claims.subject,
      email: trimmedEmail,
      emailVerified: claims.emailVerified && Boolean(trimmedEmail),
      normalizedEmail,
    });

    if (!account.isActive) {
      throw new InvalidCredentialsException();
    }

    return this.tokenService.createRefreshToken(account.userId);
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

  async updateUserProfile(
    userId: string,
    input: { locale?: string; timezone?: string },
  ): Promise<UserProfile> {
    return this.identityAccountService.updateProfile(userId, input);
  }
}
