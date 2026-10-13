import { describe, expect, it } from 'vitest';
import {
  hasTenantLevelMembership,
  membershipAppliesToResource,
} from './membership-scope.js';

describe('membershipAppliesToResource', () => {
  it('lets a tenant-level membership apply to any resource in the tenant', () => {
    expect(
      membershipAppliesToResource(
        { communityId: null, isActive: true },
        'community-1',
        ['parent'],
      ),
    ).toBe(true);
  });

  it('does not let a community membership apply to tenant-level resources', () => {
    expect(
      membershipAppliesToResource(
        { communityId: 'community-1', isActive: true },
        null,
        [],
      ),
    ).toBe(false);
  });

  it('lets a parent-community membership apply to a descendant resource', () => {
    expect(
      membershipAppliesToResource(
        { communityId: 'parent', isActive: true },
        'child',
        ['parent'],
      ),
    ).toBe(true);
  });

  it('does not let a child membership apply to a parent resource', () => {
    expect(
      membershipAppliesToResource(
        { communityId: 'child', isActive: true },
        'parent',
        [],
      ),
    ).toBe(false);
  });

  it('ignores inactive memberships', () => {
    expect(
      membershipAppliesToResource(
        { communityId: null, isActive: false },
        null,
        [],
      ),
    ).toBe(false);
  });
});

describe('hasTenantLevelMembership', () => {
  it('detects an active tenant-level membership', () => {
    expect(
      hasTenantLevelMembership([
        { communityId: 'c1', isActive: true },
        { communityId: null, isActive: true },
      ]),
    ).toBe(true);
  });
});
