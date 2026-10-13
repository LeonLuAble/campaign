export const TENANT_READER = 'TENANT_READER';
export const COMMUNITY_READER = 'COMMUNITY_READER';
export const MEMBERSHIP_READER = 'MEMBERSHIP_READER';
export const CAMPAIGN_READER = 'CAMPAIGN_READER';
export const PARTICIPATION_READER = 'PARTICIPATION_READER';
export const ACTION_READER = 'ACTION_READER';
export const COMMITMENT_READER = 'COMMITMENT_READER';
export const MILESTONE_READER = 'MILESTONE_READER';
export const MEASUREMENT_DEFINITION_READER = 'MEASUREMENT_DEFINITION_READER';
export const IMPACT_FACTOR_READER = 'IMPACT_FACTOR_READER';

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

export interface CampaignAccessRecord {
  id: string;
  tenantId: string;
}

export interface CampaignReader {
  findTemplateById(id: string): Promise<CampaignAccessRecord | null>;
  findScopeById(id: string): Promise<CampaignAccessRecord | null>;
  findCampaignById(id: string): Promise<CampaignAccessRecord | null>;
}

export interface ParticipationReader {
  findById(id: string): Promise<CampaignAccessRecord | null>;
}

export interface ActionReader {
  findActionById(id: string): Promise<CampaignAccessRecord | null>;
  findDefinitionById(id: string): Promise<CampaignAccessRecord | null>;
  findSubmissionById(id: string): Promise<CampaignAccessRecord | null>;
}

export interface CommitmentReader {
  findById(id: string): Promise<CampaignAccessRecord | null>;
}

export interface MilestoneReader {
  findById(id: string): Promise<CampaignAccessRecord | null>;
}

export interface MeasurementDefinitionReader {
  findById(id: string): Promise<CampaignAccessRecord | null>;
}

export interface ImpactFactorReader {
  findById(id: string): Promise<CampaignAccessRecord | null>;
}
