/**
 * Shared request and response contracts will be added here when a client needs them.
 * Do not copy backend domain models into this package.
 * The API in apps/api remains authoritative for business rules.
 */
export const API_VERSION = 'v1';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'VALIDATION_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_INVALID'
  | 'TOKEN_REUSED'
  | 'TOKEN_EXPIRED'
  | 'IDENTITY_ALREADY_EXISTS'
  | 'WEAK_PASSWORD';

export interface ApiErrorResponse {
  statusCode: number;
  code: ErrorCode;
  error: string;
  message: string | string[];
  correlationId: string | null;
  timestamp: string;
  path: string;
}

export interface RegisterRequest {
  identifier: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  identifier: string;
  type: 'email' | 'mobile';
}

export interface ActivateRequest {
  token: string;
}

export interface ActivateResendRequest {
  identifier: string;
}

export interface PasswordResetRequest {
  identifier: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  password: string;
}

export interface AcceptedResponse {
  accepted: true;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
  revokeFamily?: boolean;
}

export interface UserIdentityResponse {
  id: string;
  type: string;
  identifier: string;
  isVerified: boolean;
}

export interface UserProfileResponse {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  locale: string | null;
  timezone: string | null;
  isActive: boolean;
  identities: UserIdentityResponse[];
}
