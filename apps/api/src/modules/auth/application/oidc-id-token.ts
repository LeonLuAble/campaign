import { jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';

export class SocialIdTokenVerificationError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'SocialIdTokenVerificationError';
    this.cause = cause;
  }
}

export async function verifyOidcIdToken(params: {
  idToken: string;
  getKey: JWTVerifyGetKey;
  issuer: string | string[];
  audience: string;
}): Promise<JWTPayload> {
  if (!params.audience) {
    throw new SocialIdTokenVerificationError(
      'Social provider audience is not configured',
    );
  }

  try {
    const { payload } = await jwtVerify(params.idToken, params.getKey, {
      issuer: params.issuer,
      audience: params.audience,
      clockTolerance: 5,
    });

    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new SocialIdTokenVerificationError('ID token is missing subject');
    }

    return payload;
  } catch (error) {
    if (error instanceof SocialIdTokenVerificationError) {
      throw error;
    }
    throw new SocialIdTokenVerificationError('Invalid ID token', error);
  }
}

export function readEmailClaim(payload: JWTPayload): {
  email: string | null;
  emailVerified: boolean;
} {
  const email =
    typeof payload.email === 'string' && payload.email.trim().length > 0
      ? payload.email.trim()
      : null;
  const rawVerified = payload.email_verified;
  const emailVerified =
    Boolean(email) && (rawVerified === true || rawVerified === 'true');
  return { email, emailVerified };
}
