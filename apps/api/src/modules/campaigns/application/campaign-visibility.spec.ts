import { describe, expect, it } from 'vitest';
import {
  campaignAppliesToMembership,
  campaignVisibleToMemberships,
  enrollmentCommunityId,
} from './campaign-visibility.js';

const tenantMembership = {
  communityId: null,
  isActive: true,
};
const hqMembership = {
  communityId: 'hq',
  isActive: true,
};
const branchMembership = {
  communityId: 'penang',
  isActive: true,
};

describe('campaign visibility', () => {
  it('treats tenant-level membership as eligible for every campaign', () => {
    expect(campaignAppliesToMembership(['penang'], tenantMembership, [])).toBe(
      true,
    );
  });

  it('treats an untargeted campaign as tenant-wide', () => {
    expect(campaignAppliesToMembership([], branchMembership, ['hq'])).toBe(
      true,
    );
  });

  it('applies a targeted campaign to the target and its descendants', () => {
    expect(campaignAppliesToMembership(['hq'], branchMembership, ['hq'])).toBe(
      true,
    );
    expect(campaignAppliesToMembership(['hq'], hqMembership, [])).toBe(true);
    expect(campaignAppliesToMembership(['penang'], hqMembership, [])).toBe(
      false,
    );
  });

  it('hides a targeted campaign from memberships outside the tree', () => {
    expect(
      campaignVisibleToMemberships(
        ['penang'],
        [hqMembership],
        new Map([['hq', []]]),
      ),
    ).toBe(false);
    expect(
      campaignVisibleToMemberships(
        ['hq'],
        [branchMembership],
        new Map([['penang', ['hq']]]),
      ),
    ).toBe(true);
  });

  it('records tenant-level enrollment as a null community', () => {
    expect(
      enrollmentCommunityId(
        ['penang'],
        [tenantMembership, branchMembership],
        new Map([['penang', ['hq']]]),
      ),
    ).toBeNull();
  });

  it('returns undefined when no membership is eligible', () => {
    expect(
      enrollmentCommunityId(['penang'], [hqMembership], new Map([['hq', []]])),
    ).toBeUndefined();
  });
});
