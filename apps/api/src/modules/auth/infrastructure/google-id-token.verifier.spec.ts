import { ConfigService } from '@nestjs/config';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { describe, expect, it } from 'vitest';
import { SocialIdTokenVerificationError } from '../application/oidc-id-token.js';
import { SocialProvider } from '../../identity/domain/user-social-identity.entity.js';
import {
  GOOGLE_ISSUERS,
  GoogleIdTokenVerifier,
} from './google-id-token.verifier.js';

describe('GoogleIdTokenVerifier', () => {
  it('maps a valid Google ID token to social claims', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    jwk.kid = 'google-key';
    const jwks = createLocalJWKSet({ keys: [jwk] });
    const idToken = await new SignJWT({
      email: 'user@example.com',
      email_verified: true,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'google-key' })
      .setSubject('google-sub')
      .setIssuer(GOOGLE_ISSUERS[0])
      .setAudience('google-client-id')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    const verifier = new GoogleIdTokenVerifier(
      {
        get: (key: string) =>
          key === 'GOOGLE_CLIENT_ID' ? 'google-client-id' : '',
      } as unknown as ConfigService,
      jwks,
    );

    await expect(verifier.verify(idToken)).resolves.toEqual({
      provider: SocialProvider.GOOGLE,
      subject: 'google-sub',
      email: 'user@example.com',
      emailVerified: true,
    });
  });

  it('fails when the Google audience is not configured', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    jwk.kid = 'google-key';
    const jwks = createLocalJWKSet({ keys: [jwk] });
    const idToken = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'google-key' })
      .setSubject('google-sub')
      .setIssuer(GOOGLE_ISSUERS[0])
      .setAudience('google-client-id')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    const verifier = new GoogleIdTokenVerifier(
      { get: () => '' } as unknown as ConfigService,
      jwks,
    );

    await expect(verifier.verify(idToken)).rejects.toBeInstanceOf(
      SocialIdTokenVerificationError,
    );
  });
});
