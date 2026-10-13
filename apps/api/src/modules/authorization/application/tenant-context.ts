import type { MembershipRecord } from './access-readers.js';

export interface TenantContext {
  tenantId: string;
  resourceCommunityId: string | null;
  memberships: MembershipRecord[];
  permissions: Set<string>;
}

export interface TenantScopeInput {
  customerId?: string | null;
  communityId?: string | null;
  membershipId?: string | null;
  roleId?: string | null;
  parentId?: string | null;
  campaignId?: string | null;
  templateId?: string | null;
  scopeId?: string | null;
  participationId?: string | null;
  actionId?: string | null;
  actionDefinitionId?: string | null;
  submissionId?: string | null;
  commitmentId?: string | null;
}
