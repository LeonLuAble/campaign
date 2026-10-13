import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import { describe, expect, it } from 'vitest';
import {
  SocialIdTokenVerificationError,
  readEmailClaim,
  verifyOidcIdToken,
} from './oidc-id-token.js';

const ISSUER = 'https://accounts.google.com';
const AUDIENCE = 'google-client-id';

async function createLocalKeys(): Promise<{
  jwks: JWTVerifyGetKey;
  sign: (
    claims?: JWTPayload,
    options?: { exp?: string | number; aud?: string; iss?: string },
  ) => Promise<string>;
}> {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  jwk.kid = 'test-key';
  const jwks = createLocalJWKSet({ keys: [jwk] });

  return {
    jwks,
    sign: async (claims = {}, options = {}) =>
      new SignJWT(claims)
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setSubject('subject-1')
        .setIssuer(options.iss ?? ISSUER)
        .setAudience(options.aud ?? AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(options.exp ?? '5m')
        .sign(privateKey),
  };
}

describe('verifyOidcIdToken', () => {
  it('accepts a token with a valid signature, issuer, audience, and expiry', async () => {
    const { jwks, sign } = await createLocalKeys();
    const idToken = await sign({
      email: 'user@example.com',
      email_verified: true,
    });

    const payload = await verifyOidcIdToken({
      idToken,
      getKey: jwks,
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    expect(payload.sub).toBe('subject-1');
    expect(payload.email).toBe('user@example.com');
  });

  it('rejects a token with the wrong issuer', async () => {
    const { jwks, sign } = await createLocalKeys();
    const idToken = await sign({}, { iss: 'https://evil.example' });

    await expect(
      verifyOidcIdToken({
        idToken,
        getKey: jwks,
        issuer: ISSUER,
        audience: AUDIENCE,
      }),
    ).rejects.toBeInstanceOf(SocialIdTokenVerificationError);
  });

  it('rejects a token with the wrong audience', async () => {
    const { jwks, sign } = await createLocalKeys();
    const idToken = await sign({}, { aud: 'other-client' });

    await expect(
      verifyOidcIdToken({
        idToken,
        getKey: jwks,
        issuer: ISSUER,
        audience: AUDIENCE,
      }),
    ).rejects.toBeInstanceOf(SocialIdTokenVerificationError);
  });

  it('rejects an expired token', async () => {
    const { jwks, sign } = await createLocalKeys();
    const idToken = await sign({}, { exp: Math.floor(Date.now() / 1000) - 60 });

    await expect(
      verifyOidcIdToken({
        idToken,
        getKey: jwks,
        issuer: ISSUER,
        audience: AUDIENCE,
      }),
    ).rejects.toBeInstanceOf(SocialIdTokenVerificationError);
  });

  it('rejects verification when the audience is empty', async () => {
    const { jwks, sign } = await createLocalKeys();
    const idToken = await sign();

    await expect(
      verifyOidcIdToken({
        idToken,
        getKey: jwks,
        issuer: ISSUER,
        audience: '',
      }),
    ).rejects.toBeInstanceOf(SocialIdTokenVerificationError);
  });
});

describe('readEmailClaim', () => {
  it('treats Apple string email_verified as verified', () => {
    expect(
      readEmailClaim({
        email: 'user@example.com',
        email_verified: 'true',
      }),
    ).toEqual({ email: 'user@example.com', emailVerified: true });
  });

  it('does not mark a missing email as verified', () => {
    expect(readEmailClaim({ email_verified: true })).toEqual({
      email: null,
      emailVerified: false,
    });
  });
});
