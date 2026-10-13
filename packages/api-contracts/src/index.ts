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
  | 'WEAK_PASSWORD'
  | 'SOCIAL_TOKEN_INVALID';

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
  password?: string;
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

export type SocialProvider = 'google' | 'apple';

export interface SocialLoginRequest {
  provider: SocialProvider;
  idToken: string;
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

export interface CustomerResponse {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  name: string;
  initialAdminUserId?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  isActive?: boolean;
}

export interface CommunityResponse {
  id: string;
  customerId: string;
  parentId: string | null;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommunityRequest {
  customerId: string;
  parentId?: string;
  name: string;
}

export interface UpdateCommunityRequest {
  name?: string;
  parentId?: string | null;
  isActive?: boolean;
}

export interface RoleSummary {
  id: string;
  key: string;
  name: string;
}

export interface RoleResponse {
  id: string;
  customerId: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PermissionResponse {
  id: string;
  key: string;
  description: string;
}

export interface CreateRoleRequest {
  customerId: string;
  key?: string;
  name: string;
  description?: string;
  permissionKeys: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissionKeys?: string[];
}

export interface MembershipResponse {
  id: string;
  customerId: string;
  userId: string;
  communityId: string | null;
  isActive: boolean;
  roles: RoleSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMembershipRequest {
  customerId: string;
  userId: string;
  communityId?: string | null;
}

export interface UpdateMembershipRequest {
  isActive?: boolean;
}

export interface AssignRoleRequest {
  roleId: string;
}

export type UserImportStatus =
  | 'uploaded'
  | 'mapped'
  | 'validated'
  | 'confirmed';

export type UserImportRowStatus =
  | 'pending'
  | 'valid'
  | 'invalid'
  | 'review'
  | 'created'
  | 'matched';

export interface UserImportMapping {
  email?: string;
  mobile?: string;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  communityId?: string;
}

export interface MapUserImportRequest {
  mapping: UserImportMapping;
}

export interface UserImportCounts {
  total: number;
  pending: number;
  valid: number;
  invalid: number;
  review: number;
  created: number;
  matched: number;
}

export interface UserImportResponse {
  id: string;
  customerId: string;
  communityId: string | null;
  originalFilename: string;
  status: UserImportStatus;
  headers: string[];
  mapping: UserImportMapping | null;
  counts: UserImportCounts;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
}

export interface UserImportRowResponse {
  id: string;
  rowNumber: number;
  rawData: Record<string, string>;
  externalId: string | null;
  email: string | null;
  mobile: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  communityId: string | null;
  status: UserImportRowStatus;
  errorCode: string | null;
  errorMessage: string | null;
  resolvedUserId: string | null;
  resolvedMembershipId: string | null;
}

export interface UserImportPreviewResponse {
  import: UserImportResponse;
  rows: UserImportRowResponse[];
}

export type CampaignStatus = 'draft' | 'published' | 'started' | 'completed';

export type ParticipationStatus = 'enrolled' | 'withdrawn';

export interface CampaignTemplateResponse {
  id: string;
  customerId: string;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignTemplateRequest {
  customerId: string;
  key?: string;
  name: string;
  description?: string;
}

export interface UpdateCampaignTemplateRequest {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CampaignScopeResponse {
  id: string;
  customerId: string;
  templateId: string;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignScopeRequest {
  customerId: string;
  templateId: string;
  key?: string;
  name: string;
  description?: string;
}

export interface UpdateCampaignScopeRequest {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CampaignResponse {
  id: string;
  customerId: string;
  templateId: string;
  scopeId: string;
  name: string;
  slug: string;
  description: string | null;
  status: CampaignStatus;
  timezone: string;
  startsOn: string | null;
  endsOn: string | null;
  communityIds: string[];
  configuration: Record<string, unknown>;
  createdByUserId: string;
  publishedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  customerId: string;
  templateId: string;
  scopeId: string;
  name: string;
  description?: string;
  timezone: string;
  startsOn?: string;
  endsOn?: string;
  communityIds?: string[];
  configuration?: Record<string, unknown>;
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string | null;
  timezone?: string;
  startsOn?: string | null;
  endsOn?: string | null;
  communityIds?: string[];
  configuration?: Record<string, unknown>;
}

export interface CampaignConfigurationResponse {
  campaignId: string;
  customerId: string;
  settings: Record<string, unknown>;
  updatedAt: string;
}

export interface ReplaceCampaignConfigurationRequest {
  settings: Record<string, unknown>;
}

export interface ReplaceCampaignCommunitiesRequest {
  communityIds: string[];
}

export interface ParticipationResponse {
  id: string;
  customerId: string;
  campaignId: string;
  userId: string;
  communityId: string | null;
  status: ParticipationStatus;
  enrolledAt: string;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateParticipationRequest {
  userId?: string;
}
