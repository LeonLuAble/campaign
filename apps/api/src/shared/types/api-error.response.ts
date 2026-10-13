export const ERROR_CODES = [
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNPROCESSABLE_ENTITY',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'VALIDATION_FAILED',
  'INVALID_CREDENTIALS',
  'TOKEN_INVALID',
  'TOKEN_REUSED',
  'TOKEN_EXPIRED',
  'IDENTITY_ALREADY_EXISTS',
  'WEAK_PASSWORD',
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
}
