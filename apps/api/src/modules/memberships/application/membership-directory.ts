export type ActivationStatus = 'pending' | 'active';

export interface MembershipUserSummary {
  id: string;
  displayName: string | null;
  email?: string;
  mobile?: string;
  activationStatus: ActivationStatus;
}

export interface MembershipCursorPayload {
  createdAt: string;
  id: string;
}

export function resolveActivationStatus(
  identities: Array<{ isVerified: boolean }>,
): ActivationStatus {
  return identities.some((identity) => identity.isVerified)
    ? 'active'
    : 'pending';
}

export function buildMembershipUserSummary(input: {
  id: string;
  displayName: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  mobile?: string | null;
  identities: Array<{ type: string; identifier: string; isVerified: boolean }>;
  includeContacts: boolean;
}): MembershipUserSummary {
  const email =
    input.email ??
    input.identities.find((identity) => identity.type === 'email')?.identifier ??
    null;
  const mobile =
    input.mobile ??
    input.identities.find((identity) => identity.type === 'mobile')
      ?.identifier ??
    null;
  const displayName =
    input.displayName?.trim() ||
    [input.firstName, input.lastName]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(' ')
      .trim() ||
    email ||
    mobile ||
    null;

  const summary: MembershipUserSummary = {
    id: input.id,
    displayName,
    activationStatus: resolveActivationStatus(input.identities),
  };
  if (input.includeContacts) {
    if (email) {
      summary.email = email;
    }
    if (mobile) {
      summary.mobile = mobile;
    }
  }
  return summary;
}

export function encodeMembershipCursor(createdAt: Date, id: string): string {
  const payload: MembershipCursorPayload = {
    createdAt: createdAt.toISOString(),
    id,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeMembershipCursor(cursor: string): {
  createdAt: Date;
  id: string;
} {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as MembershipCursorPayload;
    if (
      typeof parsed?.createdAt !== 'string' ||
      typeof parsed?.id !== 'string' ||
      Number.isNaN(Date.parse(parsed.createdAt))
    ) {
      throw new Error('invalid');
    }
    return { createdAt: new Date(parsed.createdAt), id: parsed.id };
  } catch {
    throw new Error('INVALID_CURSOR');
  }
}

export function escapeIlikePattern(value: string): string {
  return value.replace(/([\\%_])/g, '\\$1');
}
