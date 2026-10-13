import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
import {
  readEmailClaim,
  verifyOidcIdToken,
} from '../application/oidc-id-token.js';
import type { VerifiedSocialClaims } from '../application/social-token.verifier.js';
import { SocialProvider } from '../../identity/domain/user-social-identity.entity.js';

export const APPLE_JWK_SET = Symbol('APPLE_JWK_SET');

export const APPLE_ISSUER = 'https://appleid.apple.com';

export const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';

@Injectable()
export class AppleIdTokenVerifier {
  private readonly jwks: JWTVerifyGetKey;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(APPLE_JWK_SET)
    jwks?: JWTVerifyGetKey,
  ) {
    this.jwks = jwks ?? createRemoteJWKSet(new URL(APPLE_JWKS_URL));
  }

  async verify(idToken: string): Promise<VerifiedSocialClaims> {
    const audience = this.configService.get<string>('APPLE_CLIENT_ID') ?? '';
    const payload = await verifyOidcIdToken({
      idToken,
      getKey: this.jwks,
      issuer: APPLE_ISSUER,
      audience,
    });
    const { email, emailVerified } = readEmailClaim(payload);

    return {
      provider: SocialProvider.APPLE,
      subject: payload.sub as string,
      email,
      emailVerified,
    };
  }
}
