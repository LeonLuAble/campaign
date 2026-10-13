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

export type PrivacyLevel =
  | 'private'
  | 'group'
  | 'community'
  | 'customer'
  | 'public';

export type ActionStatus = 'recorded' | 'cancelled';

export type SubmissionStatus = 'submitted' | 'approved' | 'rejected';

export type SubmissionReviewMode = 'auto' | 'manual';

export interface ActionDefinitionResponse {
  id: string;
  customerId: string;
  campaignId: string;
  key: string;
  name: string;
  unit: string;
  description: string | null;
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActionDefinitionRequest {
  key?: string;
  name: string;
  unit: string;
  description?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateActionDefinitionRequest {
  name?: string;
  unit?: string;
  description?: string | null;
  isActive?: boolean;
  settings?: Record<string, unknown>;
}

export interface CommitmentResponse {
  id: string;
  customerId: string;
  campaignId: string;
  participationId: string;
  typeKey: string | null;
  targetValue: number;
  unit: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommitmentRequest {
  typeKey?: string;
  targetValue: number;
  unit: string;
  payload?: Record<string, unknown>;
}

export interface UpdateCommitmentRequest {
  typeKey?: string | null;
  targetValue?: number;
  unit?: string;
  payload?: Record<string, unknown>;
}

export interface SubmissionResponse {
  id: string;
  customerId: string;
  actionId: string;
  status: SubmissionStatus;
  submittedByUserId: string;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionResponse {
  id: string;
  customerId: string;
  campaignId: string;
  participationId: string;
  userId: string;
  actionDefinitionId: string;
  occurredOn: string;
  quantity: number;
  privacyLevel: PrivacyLevel;
  status: ActionStatus;
  payload: Record<string, unknown>;
  idempotencyKey: string | null;
  recordedByUserId: string;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  correctedAt: string | null;
  correctedByUserId: string | null;
  submission: SubmissionResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActionRequest {
  participationId: string;
  actionDefinitionId: string;
  occurredOn?: string;
  quantity?: number;
  privacyLevel?: PrivacyLevel;
  idempotencyKey?: string;
  payload?: Record<string, unknown>;
}

export interface UpdateActionRequest {
  occurredOn?: string;
  quantity?: number;
  privacyLevel?: PrivacyLevel;
  payload?: Record<string, unknown>;
}

export interface ReviewSubmissionRequest {
  note?: string;
}

export type CompletionStatus =
  | 'none'
  | 'not_started'
  | 'in_progress'
  | 'achieved'
  | 'exceeded';

export type MilestoneMetric = 'completion_percent' | 'achieved_value';

export interface ProgressUnit {
  unit: string;
  achievedValue: number;
  targetValue: number;
  completionPercent: number | null;
  completionStatus: CompletionStatus;
  approvedActionCount: number;
  distinctApprovedDays: number;
  committedParticipantCount: number;
}

export interface ParticipantProgressResponse {
  scope: 'participant';
  customerId: string;
  campaignId: string;
  participationId: string;
  userId: string;
  communityId: string | null;
  timezone: string;
  commitment: {
    id: string;
    typeKey: string | null;
    targetValue: number;
    unit: string;
  } | null;
  unit: string | null;
  achievedValue: number;
  targetValue: number;
  completionPercent: number | null;
  completionStatus: CompletionStatus;
  approvedActionCount: number;
  distinctApprovedDays: number;
  byUnit: ProgressUnit[];
}

export interface AchievementResponse {
  customerId: string;
  campaignId: string;
  participationId: string;
  userId: string;
  unit: string | null;
  achievedValue: number;
  approvedActionCount: number;
  distinctApprovedDays: number;
}

export interface AggregateProgressResponse {
  scope: 'campaign' | 'community';
  customerId: string;
  campaignId: string;
  communityId: string | null;
  timezone: string;
  participantCount: number;
  committedParticipantCount: number;
  units: ProgressUnit[];
}

export interface MilestoneResponse {
  id: string;
  customerId: string;
  campaignId: string;
  key: string;
  name: string;
  description: string | null;
  metric: MilestoneMetric;
  thresholdValue: number;
  unit: string;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMilestoneRequest {
  key?: string;
  name: string;
  description?: string;
  metric: MilestoneMetric;
  thresholdValue: number;
  unit: string;
}

export interface UpdateMilestoneRequest {
  name?: string;
  description?: string | null;
  metric?: MilestoneMetric;
  thresholdValue?: number;
  unit?: string;
  isActive?: boolean;
}

export interface MilestoneProgressResponse {
  milestoneId: string;
  campaignId: string;
  customerId: string;
  metric: MilestoneMetric;
  unit: string;
  thresholdValue: number;
  currentAchievedValue: number;
  currentTargetValue: number;
  currentCompletionPercent: number | null;
  crossed: boolean;
  status: CompletionStatus;
  computedAt: string;
}

export interface MilestoneEvaluationResponse {
  id: string;
  milestoneId: string;
  customerId: string;
  evaluatedByUserId: string;
  achievedValue: number;
  targetValue: number;
  completionPercent: number | null;
  crossed: boolean;
  status: CompletionStatus;
  evaluatedAt: string;
  createdAt: string;
}
