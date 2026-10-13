import type { MembershipRecord } from '../../authorization/application/access-readers.js';
import { hasTenantLevelMembership } from '../../authorization/application/membership-scope.js';

export function campaignAppliesToMembership(
  targetCommunityIds: string[],
  membership: Pick<MembershipRecord, 'communityId' | 'isActive'>,
  ancestorIdsOfMembershipCommunity: string[],
): boolean {
  if (!membership.isActive) {
    return false;
  }
  if (membership.communityId === null) {
    return true;
  }
  if (targetCommunityIds.length === 0) {
    return true;
  }
  if (targetCommunityIds.includes(membership.communityId)) {
    return true;
  }
  return ancestorIdsOfMembershipCommunity.some((id) =>
    targetCommunityIds.includes(id),
  );
}

export function campaignVisibleToMemberships(
  targetCommunityIds: string[],
  memberships: Array<Pick<MembershipRecord, 'communityId' | 'isActive'>>,
  ancestorsByCommunityId: Map<string, string[]>,
): boolean {
  if (hasTenantLevelMembership(memberships)) {
    return true;
  }
  return memberships.some((membership) =>
    campaignAppliesToMembership(
      targetCommunityIds,
      membership,
      membership.communityId
        ? (ancestorsByCommunityId.get(membership.communityId) ?? [])
        : [],
    ),
  );
}

export function enrollmentCommunityId(
  targetCommunityIds: string[],
  memberships: Array<Pick<MembershipRecord, 'communityId' | 'isActive'>>,
  ancestorsByCommunityId: Map<string, string[]>,
): string | null | undefined {
  const eligible = memberships.filter((membership) =>
    campaignAppliesToMembership(
      targetCommunityIds,
      membership,
      membership.communityId
        ? (ancestorsByCommunityId.get(membership.communityId) ?? [])
        : [],
    ),
  );
  if (eligible.length === 0) {
    return undefined;
  }
  const tenantLevel = eligible.find(
    (membership) => membership.communityId === null,
  );
  if (tenantLevel) {
    return null;
  }
  return eligible[0]?.communityId ?? null;
}
