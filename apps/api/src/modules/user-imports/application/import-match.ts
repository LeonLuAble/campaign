export type ImportMatchAction = 'create' | 'match' | 'review';

export interface IdentityMatch {
  userId: string;
  isActive: boolean;
}

export interface ImportMatchInput {
  externalUserId: string | null;
  email: IdentityMatch | null;
  mobile: IdentityMatch | null;
  emailInTenant: boolean;
  mobileInTenant: boolean;
}

export interface ImportMatchDecision {
  action: ImportMatchAction;
  userId?: string;
  code?: string;
  message?: string;
}

export function decideImportMatch(
  input: ImportMatchInput,
): ImportMatchDecision {
  if (input.externalUserId) {
    if (input.email && input.email.userId !== input.externalUserId) {
      return review(
        'IDENTITY_CONFLICT',
        'external_id and email resolve to different users',
      );
    }
    if (input.mobile && input.mobile.userId !== input.externalUserId) {
      return review(
        'IDENTITY_CONFLICT',
        'external_id and mobile resolve to different users',
      );
    }
    return { action: 'match', userId: input.externalUserId };
  }

  if (
    input.email &&
    input.mobile &&
    input.email.userId !== input.mobile.userId
  ) {
    return review(
      'IDENTITY_CONFLICT',
      'email and mobile resolve to different users',
    );
  }

  const candidate = input.email ?? input.mobile;
  if (!candidate) {
    return { action: 'create' };
  }

  const inTenant = input.email ? input.emailInTenant : input.mobileInTenant;
  if (!inTenant) {
    return review(
      'EXISTING_IDENTITY',
      'An existing account already uses this identifier',
    );
  }
  if (!candidate.isActive) {
    return review('USER_INACTIVE', 'Matched user is inactive');
  }
  return { action: 'match', userId: candidate.userId };
}

function review(code: string, message: string): ImportMatchDecision {
  return { action: 'review', code, message };
}
