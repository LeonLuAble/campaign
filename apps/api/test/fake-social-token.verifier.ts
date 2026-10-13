import { SocialTokenInvalidException } from '../src/modules/auth/application/auth.exceptions.js';
import type {
  SocialTokenVerifier,
  VerifiedSocialClaims,
} from '../src/modules/auth/application/social-token.verifier.js';
import { SocialProvider } from '../src/modules/identity/domain/user-social-identity.entity.js';

export class FakeSocialTokenVerifier implements SocialTokenVerifier {
  async verify(
    provider: SocialProvider,
    idToken: string,
  ): Promise<VerifiedSocialClaims> {
    let payload: {
      subject?: string;
      email?: string | null;
      emailVerified?: boolean;
    };
    try {
      payload = JSON.parse(idToken) as typeof payload;
    } catch {
      throw new SocialTokenInvalidException();
    }

    if (!payload.subject) {
      throw new SocialTokenInvalidException();
    }

    return {
      provider,
      subject: payload.subject,
      email: payload.email ?? null,
      emailVerified: payload.emailVerified === true,
    };
  }
}
