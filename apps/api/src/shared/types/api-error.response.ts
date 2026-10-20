export const ERROR_CODES = [
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNPROCESSABLE_ENTITY',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'VALIDATION_FAILED',
  'INVALID_CREDENTIALS',
  'TOKEN_INVALID',
  'TOKEN_REUSED',
  'TOKEN_EXPIRED',
  'IDENTITY_ALREADY_EXISTS',
  'WEAK_PASSWORD',
  'SOCIAL_TOKEN_INVALID',
  'SETUP_NOT_AVAILABLE',
  'INVALID_SETUP_KEY',
  'CAMPAIGN_FIELD_LOCKED',
  'CAMPAIGN_END_DATE_LOCKED',
  'ENROLMENT_AUTO_MANAGED',
  'MILESTONE_DATE_DUPLICATE',
  'MILESTONE_DATE_OUT_OF_WINDOW',
  'MILESTONE_LOCKED',
  'PERIOD_CLOSED',
  'COMMITMENT_TARGET_EXCEEDS_PERIOD',
  'NO_COMMITMENT_FOR_DATE',
  'SUBMISSION_OVERLAP',
  'RANGE_SPANS_PERIODS',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function isErrorCode(code: string): code is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(code);
}

export interface ApiErrorResponse {
  statusCode: number;
  code: ErrorCode;
  error: string;
  message: string | string[];
  correlationId: string | null;
  timestamp: string;
  path: string;
  /** Machine-readable extras for some codes, e.g. `conflictingDates`. */
  details?: Record<string, unknown>;
}
