import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
import {
  readEmailClaim,
  verifyOidcIdToken,
} from '../application/oidc-id-token.js';
import type { VerifiedSocialClaims } from '../application/social-token.verifier.js';
import { SocialProvider } from '../../identity/domain/user-social-identity.entity.js';

export const GOOGLE_JWK_SET = Symbol('GOOGLE_JWK_SET');

export const GOOGLE_ISSUERS = [
  'https://accounts.google.com',
  'accounts.google.com',
] as const;

export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

@Injectable()
export class GoogleIdTokenVerifier {
  private readonly jwks: JWTVerifyGetKey;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(GOOGLE_JWK_SET)
    jwks?: JWTVerifyGetKey,
  ) {
    this.jwks = jwks ?? createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  }

  async verify(idToken: string): Promise<VerifiedSocialClaims> {
    const audience = this.configService.get<string>('GOOGLE_CLIENT_ID') ?? '';
    const payload = await verifyOidcIdToken({
      idToken,
      getKey: this.jwks,
      issuer: [...GOOGLE_ISSUERS],
      audience,
    });
    const { email, emailVerified } = readEmailClaim(payload);

    return {
      provider: SocialProvider.GOOGLE,
      subject: payload.sub as string,
      email,
      emailVerified,
    };
  }
}
