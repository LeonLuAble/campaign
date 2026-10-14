import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceNotFoundException } from '../../../shared/errors/domain-http.exceptions.js';
import {
  COMMUNITY_SERVICE,
  TENANT_READER,
} from '../../authorization/application/access-readers.js';
import { AuthorizationService } from '../../authorization/application/authorization.service.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { SYSTEM_ROLE_MEMBER } from '../../authorization/domain/permission-keys.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import { Membership } from '../domain/membership.entity.js';
import { MembershipService } from './membership.service.js';

describe('MembershipService', () => {
  let service: MembershipService;
  const membershipRepository = {
    findOne: vi.fn(),
    find: vi.fn(),
  };
  const authorization = {
    findSystemRoleByKey: vi.fn(),
    assignRole: vi.fn(),
    listRolesByMembershipIds: vi.fn(),
  };
  const tenants = { findById: vi.fn() };
  const communities = {};
  const identities = {};

  const tenant: TenantContext = {
    tenantId: 'tenant-1',
    resourceCommunityId: null,
    memberships: [
      {
        id: 'admin-membership',
        tenantId: 'tenant-1',
        userId: 'admin',
        communityId: null,
        isActive: true,
      },
    ],
    permissions: new Set(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MembershipService,
        {
          provide: getRepositoryToken(Membership),
          useValue: membershipRepository,
        },
        { provide: AuthorizationService, useValue: authorization },
        { provide: TENANT_READER, useValue: tenants },
        { provide: COMMUNITY_SERVICE, useValue: communities },
        { provide: IdentityAccountService, useValue: identities },
      ],
    }).compile();
    service = module.get(MembershipService);
  });

  it('assigns a system role through authorization after looking it up by key', async () => {
    membershipRepository.findOne.mockResolvedValue({
      id: 'membership-1',
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      community_id: null,
      is_active: true,
    });
    tenants.findById.mockResolvedValue({ id: 'tenant-1', isActive: true });
    authorization.findSystemRoleByKey.mockResolvedValue({
      id: 'role-member',
      key: SYSTEM_ROLE_MEMBER,
    });
    authorization.assignRole.mockResolvedValue([
      { id: 'role-member', key: SYSTEM_ROLE_MEMBER, name: 'Member' },
    ]);

    await expect(
      service.assignSystemRole(tenant, 'membership-1', SYSTEM_ROLE_MEMBER),
    ).resolves.toEqual([
      { id: 'role-member', key: SYSTEM_ROLE_MEMBER, name: 'Member' },
    ]);
    expect(authorization.findSystemRoleByKey).toHaveBeenCalledWith(
      'tenant-1',
      SYSTEM_ROLE_MEMBER,
    );
    expect(authorization.assignRole).toHaveBeenCalledWith(
      'tenant-1',
      'membership-1',
      'tenant-1',
      'role-member',
    );
  });

  it('does not assign when the system role is missing', async () => {
    authorization.findSystemRoleByKey.mockRejectedValue(
      new ResourceNotFoundException('Role not found'),
    );

    await expect(
      service.assignSystemRole(tenant, 'membership-1', SYSTEM_ROLE_MEMBER),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(authorization.assignRole).not.toHaveBeenCalled();
  });
});
