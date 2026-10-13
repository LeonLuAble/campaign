import { SocialProvider } from '../../identity/domain/user-social-identity.entity.js';

export const SOCIAL_TOKEN_VERIFIER = Symbol('SOCIAL_TOKEN_VERIFIER');

export interface VerifiedSocialClaims {
  provider: SocialProvider;
  subject: string;
  email: string | null;
  emailVerified: boolean;
}

export interface SocialTokenVerifier {
  verify(
    provider: SocialProvider,
    idToken: string,
  ): Promise<VerifiedSocialClaims>;
}
