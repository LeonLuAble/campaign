import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessForbiddenException } from '../../../shared/errors/domain-http.exceptions.js';
import { MembershipRole } from '../domain/membership-role.entity.js';
import { Permission } from '../domain/permission.entity.js';
import { PERMISSIONS } from '../domain/permission-keys.js';
import { RolePermission } from '../domain/role-permission.entity.js';
import { Role } from '../domain/role.entity.js';
import { AuthorizationService } from './authorization.service.js';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  const roleRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn(),
  };
  const permissionRepository = { find: vi.fn() };
  const rolePermissionRepository = {
    find: vi.fn(),
    delete: vi.fn(),
    save: vi.fn(),
    create: vi.fn(),
    manager: {},
  };
  const membershipRoleRepository = {
    createQueryBuilder: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    manager: {},
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        { provide: getRepositoryToken(Role), useValue: roleRepository },
        {
          provide: getRepositoryToken(Permission),
          useValue: permissionRepository,
        },
        {
          provide: getRepositoryToken(RolePermission),
          useValue: rolePermissionRepository,
        },
        {
          provide: getRepositoryToken(MembershipRole),
          useValue: membershipRoleRepository,
        },
      ],
    }).compile();
    service = module.get(AuthorizationService);
  });

  it('resolves the union of permissions from applicable memberships', async () => {
    const getRawMany = vi
      .fn()
      .mockResolvedValue([
        { key: PERMISSIONS.CUSTOMERS_READ },
        { key: PERMISSIONS.COMMUNITIES_READ },
      ]);
    membershipRoleRepository.createQueryBuilder.mockReturnValue({
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      distinct: vi.fn().mockReturnThis(),
      getRawMany,
    });

    const keys = await service.resolvePermissionKeys([
      {
        id: 'm1',
        tenantId: 't1',
        userId: 'u1',
        communityId: null,
        isActive: true,
      },
    ]);

    expect(keys).toEqual(
      new Set([PERMISSIONS.CUSTOMERS_READ, PERMISSIONS.COMMUNITIES_READ]),
    );
    expect(getRawMany).toHaveBeenCalled();
  });

  it('returns no permissions when every membership is inactive', async () => {
    const keys = await service.resolvePermissionKeys([
      {
        id: 'm1',
        tenantId: 't1',
        userId: 'u1',
        communityId: 'community-a',
        isActive: false,
      },
    ]);
    expect(keys.size).toBe(0);
    expect(membershipRoleRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('rejects changing permissions on a system role', async () => {
    roleRepository.findOne.mockResolvedValue({
      id: 'role-1',
      tenant_id: 't1',
      key: 'tenant_admin',
      is_system: true,
    });

    await expect(
      service.updateRole(
        't1',
        'role-1',
        {
          permissionKeys: [PERMISSIONS.CUSTOMERS_READ],
        },
        [
          {
            id: 'm1',
            tenantId: 't1',
            userId: 'u1',
            communityId: null,
            isActive: true,
          },
        ],
      ),
    ).rejects.toBeInstanceOf(AccessForbiddenException);
  });
});
