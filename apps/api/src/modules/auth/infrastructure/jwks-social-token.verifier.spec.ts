import { describe, expect, it, vi } from 'vitest';
import { SocialTokenInvalidException } from '../application/auth.exceptions.js';
import { SocialIdTokenVerificationError } from '../application/oidc-id-token.js';
import { SocialProvider } from '../../identity/domain/user-social-identity.entity.js';
import { AppleIdTokenVerifier } from './apple-id-token.verifier.js';
import { GoogleIdTokenVerifier } from './google-id-token.verifier.js';
import { JwksSocialTokenVerifier } from './jwks-social-token.verifier.js';

describe('JwksSocialTokenVerifier', () => {
  it('maps provider verification failures to SOCIAL_TOKEN_INVALID', async () => {
    const google = {
      verify: vi
        .fn()
        .mockRejectedValue(new SocialIdTokenVerificationError('bad token')),
    };
    const apple = { verify: vi.fn() };
    const verifier = new JwksSocialTokenVerifier(
      google as unknown as GoogleIdTokenVerifier,
      apple as unknown as AppleIdTokenVerifier,
    );

    await expect(
      verifier.verify(SocialProvider.GOOGLE, 'token'),
    ).rejects.toBeInstanceOf(SocialTokenInvalidException);
    expect(apple.verify).not.toHaveBeenCalled();
  });
});
