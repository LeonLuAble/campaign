import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationService } from '../../authorization/application/authorization.service.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { CustomerService } from './customer.service.js';

describe('CustomerService.getAccess', () => {
  let service: CustomerService;
  const authorization = {
    listRolesByMembershipIds: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    service = new CustomerService(
      {} as never,
      {} as never,
      {} as never,
      authorization as unknown as AuthorizationService,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('aggregates roles, permission keys, and community roots', async () => {
    authorization.listRolesByMembershipIds.mockResolvedValue(
      new Map([
        [
          'm1',
          [
            { id: 'r1', key: 'community_leader', name: 'Leader' },
            { id: 'r2', key: 'member', name: 'Member' },
          ],
        ],
        ['m2', [{ id: 'r2', key: 'member', name: 'Member' }]],
      ]),
    );

    const tenant: TenantContext = {
      tenantId: 't1',
      resourceCommunityId: null,
      memberships: [
        {
          id: 'm1',
          tenantId: 't1',
          userId: 'u1',
          communityId: 'c-hq',
          isActive: true,
        },
        {
          id: 'm2',
          tenantId: 't1',
          userId: 'u1',
          communityId: 'c-branch',
          isActive: true,
        },
      ],
      permissions: new Set(['memberships.read', 'communities.read']),
    };

    await expect(service.getAccess(tenant)).resolves.toEqual({
      roles: [
        { id: 'r1', key: 'community_leader', name: 'Leader' },
        { id: 'r2', key: 'member', name: 'Member' },
      ],
      permissionKeys: ['communities.read', 'memberships.read'],
      isTenantLevel: false,
      communityIds: ['c-branch', 'c-hq'],
    });
  });
});
