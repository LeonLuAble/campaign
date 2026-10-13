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
}
