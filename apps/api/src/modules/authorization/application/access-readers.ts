export const TENANT_READER = 'TENANT_READER';
export const COMMUNITY_READER = 'COMMUNITY_READER';
export const MEMBERSHIP_READER = 'MEMBERSHIP_READER';

export interface TenantRecord {
  id: string;
  isActive: boolean;
}

export interface CommunityRecord {
  id: string;
  tenantId: string;
  parentId: string | null;
  isActive: boolean;
}

export interface MembershipRecord {
  id: string;
  tenantId: string;
  userId: string;
  communityId: string | null;
  isActive: boolean;
}

export interface TenantReader {
  findById(id: string): Promise<TenantRecord | null>;
}

export interface CommunityReader {
  findById(id: string): Promise<CommunityRecord | null>;
  listAncestorIds(id: string): Promise<string[]>;
  listDescendantIds(id: string): Promise<string[]>;
}

export interface MembershipReader {
  findById(id: string): Promise<MembershipRecord | null>;
  listByIds(ids: string[]): Promise<MembershipRecord[]>;
  listActiveForUserInTenant(
    userId: string,
    tenantId: string,
  ): Promise<MembershipRecord[]>;
  listActiveForUser(userId: string): Promise<MembershipRecord[]>;
  listTenantIdsForUser(userId: string): Promise<string[]>;
}
