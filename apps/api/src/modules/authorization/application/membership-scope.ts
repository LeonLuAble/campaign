import type { MembershipRecord } from './access-readers.js';

export function membershipAppliesToResource(
  membership: Pick<MembershipRecord, 'communityId' | 'isActive'>,
  resourceCommunityId: string | null,
  ancestorIdsOfResource: string[],
): boolean {
  if (!membership.isActive) {
    return false;
  }
  if (membership.communityId === null) {
    return true;
  }
  if (resourceCommunityId === null) {
    return false;
  }
  if (membership.communityId === resourceCommunityId) {
    return true;
  }
  return ancestorIdsOfResource.includes(membership.communityId);
}

export function hasTenantLevelMembership(
  memberships: Array<Pick<MembershipRecord, 'communityId' | 'isActive'>>,
): boolean {
  return memberships.some(
    (membership) => membership.isActive && membership.communityId === null,
  );
}
