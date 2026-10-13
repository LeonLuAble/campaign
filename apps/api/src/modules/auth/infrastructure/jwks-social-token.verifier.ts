import { Injectable } from '@nestjs/common';
import { SocialProvider } from '../../identity/domain/user-social-identity.entity.js';
import { SocialTokenInvalidException } from '../application/auth.exceptions.js';
import { SocialIdTokenVerificationError } from '../application/oidc-id-token.js';
import type {
  SocialTokenVerifier,
  VerifiedSocialClaims,
} from '../application/social-token.verifier.js';
import { AppleIdTokenVerifier } from './apple-id-token.verifier.js';
import { GoogleIdTokenVerifier } from './google-id-token.verifier.js';

@Injectable()
export class JwksSocialTokenVerifier implements SocialTokenVerifier {
  constructor(
    private readonly googleIdTokenVerifier: GoogleIdTokenVerifier,
    private readonly appleIdTokenVerifier: AppleIdTokenVerifier,
  ) {}

  async verify(
    provider: SocialProvider,
    idToken: string,
  ): Promise<VerifiedSocialClaims> {
    try {
      if (provider === SocialProvider.GOOGLE) {
        return await this.googleIdTokenVerifier.verify(idToken);
      }
      if (provider === SocialProvider.APPLE) {
        return await this.appleIdTokenVerifier.verify(idToken);
      }
      throw new SocialTokenInvalidException();
    } catch (error) {
      if (error instanceof SocialTokenInvalidException) {
        throw error;
      }
      if (error instanceof SocialIdTokenVerificationError) {
        throw new SocialTokenInvalidException();
      }
      throw error;
    }
  }
}
