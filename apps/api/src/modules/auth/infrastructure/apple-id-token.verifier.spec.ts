import { ConfigService } from '@nestjs/config';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { describe, expect, it } from 'vitest';
import { SocialProvider } from '../../identity/domain/user-social-identity.entity.js';
import {
  APPLE_ISSUER,
  AppleIdTokenVerifier,
} from './apple-id-token.verifier.js';

describe('AppleIdTokenVerifier', () => {
  it('maps a valid Apple ID token including string email_verified', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    jwk.kid = 'apple-key';
    const jwks = createLocalJWKSet({ keys: [jwk] });
    const idToken = await new SignJWT({
      email: 'user@privaterelay.appleid.com',
      email_verified: 'true',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'apple-key' })
      .setSubject('apple-sub')
      .setIssuer(APPLE_ISSUER)
      .setAudience('apple-client-id')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    const verifier = new AppleIdTokenVerifier(
      {
        get: (key: string) =>
          key === 'APPLE_CLIENT_ID' ? 'apple-client-id' : '',
      } as unknown as ConfigService,
      jwks,
    );

    await expect(verifier.verify(idToken)).resolves.toEqual({
      provider: SocialProvider.APPLE,
      subject: 'apple-sub',
      email: 'user@privaterelay.appleid.com',
      emailVerified: true,
    });
  });
});
