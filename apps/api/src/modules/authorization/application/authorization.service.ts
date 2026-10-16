import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { EntityManager, In, Repository } from 'typeorm';
import {
  AccessForbiddenException,
  InvalidRequestException,
  ResourceConflictException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import {
  isRaiseException,
  isUniqueViolation,
} from '../../../shared/database/postgres-errors.js';
import { slugify } from '../../../shared/text/slugify.js';
import { MembershipRole } from '../domain/membership-role.entity.js';
import { Permission } from '../domain/permission.entity.js';
import {
  ALL_PERMISSION_KEYS,
  MEMBER_PERMISSION_KEYS,
  SYSTEM_ROLE_MEMBER,
  SYSTEM_ROLE_TENANT_ADMIN,
  type PermissionKey,
} from '../domain/permission-keys.js';
import { RolePermission } from '../domain/role-permission.entity.js';
import { Role } from '../domain/role.entity.js';
import type { MembershipRecord } from './access-readers.js';
import { hasTenantLevelMembership } from './membership-scope.js';

export interface RoleSummary {
  id: string;
  key: string;
  name: string;
}

export interface RoleResponse {
  id: string;
  customerId: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PermissionResponse {
  id: string;
  key: string;
  description: string;
}

export interface CreateRoleInput {
  key?: string;
  name: string;
  description?: string | null;
  permissionKeys: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  permissionKeys?: string[];
}

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(MembershipRole)
    private readonly membershipRoleRepository: Repository<MembershipRole>,
  ) {}

  async listPermissions(): Promise<PermissionResponse[]> {
    const permissions = await this.permissionRepository.find({
      order: { key: 'ASC' },
    });
    return permissions.map((permission) => ({
      id: permission.id,
      key: permission.key,
      description: permission.description,
    }));
  }

  async seedSystemRoles(
    manager: EntityManager,
    tenantId: string,
  ): Promise<void> {
    const permissions = await manager.getRepository(Permission).find();
    const byKey = new Map(
      permissions.map((permission) => [permission.key, permission]),
    );

    const admin = await this.ensureSystemRole(
      manager,
      tenantId,
      SYSTEM_ROLE_TENANT_ADMIN,
      'Tenant Admin',
      'Full access within the tenant',
    );
    const member = await this.ensureSystemRole(
      manager,
      tenantId,
      SYSTEM_ROLE_MEMBER,
      'Member',
      'Self-scoped campaign reads and creates within the tenant',
    );

    await this.replaceRolePermissions(
      manager,
      admin.id,
      ALL_PERMISSION_KEYS.map((key) => byKey.get(key)?.id).filter(
        (id): id is string => Boolean(id),
      ),
    );
    await this.replaceRolePermissions(
      manager,
      member.id,
      MEMBER_PERMISSION_KEYS.map((key) => byKey.get(key)?.id).filter(
        (id): id is string => Boolean(id),
      ),
    );
  }

  async findSystemRole(
    manager: EntityManager,
    tenantId: string,
    key: string,
  ): Promise<Role> {
    const role = await manager.getRepository(Role).findOne({
      where: { tenant_id: tenantId, key, is_system: true },
    });
    if (!role) {
      throw new ResourceNotFoundException('Role not found');
    }
    return role;
  }

  async findSystemRoleByKey(tenantId: string, key: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { tenant_id: tenantId, key, is_system: true },
    });
    if (!role) {
      throw new ResourceNotFoundException('Role not found');
    }
    return role;
  }

  async assignRoleInTransaction(
    manager: EntityManager,
    membershipId: string,
    roleId: string,
  ): Promise<void> {
    const repository = manager.getRepository(MembershipRole);
    const existing = await repository.findOne({
      where: { membership_id: membershipId, role_id: roleId },
    });
    if (existing) {
      return;
    }
    try {
      await repository.save(
        repository.create({
          membership_id: membershipId,
          role_id: roleId,
        }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        return;
      }
      if (isRaiseException(error)) {
        throw new ResourceNotFoundException('Role not found');
      }
      throw error;
    }
  }

  async resolvePermissionKeys(
    memberships: MembershipRecord[],
  ): Promise<Set<string>> {
    const applicable = memberships.filter((membership) => membership.isActive);
    if (applicable.length === 0) {
      return new Set();
    }

    const rows = await this.membershipRoleRepository
      .createQueryBuilder('mr')
      .innerJoin(RolePermission, 'rp', 'rp.role_id = mr.role_id')
      .innerJoin(Permission, 'p', 'p.id = rp.permission_id')
      .where('mr.membership_id IN (:...ids)', {
        ids: applicable.map((membership) => membership.id),
      })
      .select('p.key', 'key')
      .distinct(true)
      .getRawMany<{ key: string }>();

    return new Set(rows.map((row) => row.key));
  }

  async findRoleById(roleId: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { id: roleId } });
  }

  async getRole(tenantId: string, roleId: string): Promise<RoleResponse> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, tenant_id: tenantId },
    });
    if (!role) {
      throw new ResourceNotFoundException('Role not found');
    }
    const [mapped] = await this.mapRoles([role]);
    return mapped;
  }

  async listRoles(tenantId: string): Promise<RoleResponse[]> {
    const roles = await this.roleRepository.find({
      where: { tenant_id: tenantId },
      order: { is_system: 'DESC', key: 'ASC' },
    });
    return this.mapRoles(roles);
  }

  async createRole(
    tenantId: string,
    input: CreateRoleInput,
    memberships: MembershipRecord[],
  ): Promise<RoleResponse> {
    this.assertTenantLevel(memberships);
    const name = input.name.trim();
    const key = this.normalizeRoleKey(input.key ?? name);
    const permissionIds = await this.resolvePermissionIds(input.permissionKeys);

    try {
      const role = await this.roleRepository.save(
        this.roleRepository.create({
          tenant_id: tenantId,
          key,
          name,
          description: input.description?.trim() || null,
          is_system: false,
        }),
      );
      await this.replaceRolePermissions(
        this.rolePermissionRepository.manager,
        role.id,
        permissionIds,
      );
      this.logger.log({
        msg: 'role_created',
        tenantId,
        roleId: role.id,
        key,
      });
      return this.getRole(tenantId, role.id);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ResourceConflictException(
          'A role with this key already exists',
        );
      }
      throw error;
    }
  }

  async updateRole(
    tenantId: string,
    roleId: string,
    input: UpdateRoleInput,
    memberships: MembershipRecord[],
  ): Promise<RoleResponse> {
    this.assertTenantLevel(memberships);
    const role = await this.roleRepository.findOne({
      where: { id: roleId, tenant_id: tenantId },
    });
    if (!role) {
      throw new ResourceNotFoundException('Role not found');
    }
    if (role.is_system && input.permissionKeys) {
      throw new AccessForbiddenException(
        'System role permissions cannot be changed',
      );
    }
    if (input.name !== undefined) {
      role.name = input.name.trim();
    }
    if (input.description !== undefined) {
      role.description = input.description?.trim() || null;
    }
    await this.roleRepository.save(role);
    if (input.permissionKeys) {
      const permissionIds = await this.resolvePermissionIds(
        input.permissionKeys,
      );
      await this.replaceRolePermissions(
        this.rolePermissionRepository.manager,
        role.id,
        permissionIds,
      );
    }
    return this.getRole(tenantId, role.id);
  }

  async listRolesByMembershipIds(
    membershipIds: string[],
  ): Promise<Map<string, RoleSummary[]>> {
    const result = new Map<string, RoleSummary[]>();
    if (membershipIds.length === 0) {
      return result;
    }

    const rows = await this.membershipRoleRepository
      .createQueryBuilder('mr')
      .innerJoin(Role, 'role', 'role.id = mr.role_id')
      .where('mr.membership_id IN (:...ids)', { ids: membershipIds })
      .select([
        'mr.membership_id AS "membershipId"',
        'role.id AS "id"',
        'role.key AS "key"',
        'role.name AS "name"',
      ])
      .orderBy('role.key', 'ASC')
      .getRawMany<{
        membershipId: string;
        id: string;
        key: string;
        name: string;
      }>();

    for (const row of rows) {
      const list = result.get(row.membershipId) ?? [];
      list.push({ id: row.id, key: row.key, name: row.name });
      result.set(row.membershipId, list);
    }
    return result;
  }

  async assignRole(
    tenantId: string,
    membershipId: string,
    membershipTenantId: string,
    roleId: string,
  ): Promise<RoleSummary[]> {
    if (membershipTenantId !== tenantId) {
      throw new ResourceNotFoundException('Membership not found');
    }
    const role = await this.requireTenantRole(tenantId, roleId);
    await this.assignRoleInTransaction(
      this.membershipRoleRepository.manager,
      membershipId,
      role.id,
    );
    this.logger.log({
      msg: 'membership_role_assigned',
      tenantId,
      membershipId,
      roleId: role.id,
    });
    return this.rolesForMembership(membershipId);
  }

  async unassignRole(
    tenantId: string,
    membershipId: string,
    membershipTenantId: string,
    roleId: string,
  ): Promise<RoleSummary[]> {
    if (membershipTenantId !== tenantId) {
      throw new ResourceNotFoundException('Membership not found');
    }
    await this.requireTenantRole(tenantId, roleId);
    await this.membershipRoleRepository.delete({
      membership_id: membershipId,
      role_id: roleId,
    });
    this.logger.log({
      msg: 'membership_role_removed',
      tenantId,
      membershipId,
      roleId,
    });
    return this.rolesForMembership(membershipId);
  }

  async listTenantAdminMembershipIds(tenantId: string): Promise<string[]> {
    const rows = await this.membershipRoleRepository
      .createQueryBuilder('mr')
      .innerJoin(Role, 'role', 'role.id = mr.role_id')
      .where('role.tenant_id = :tenantId', { tenantId })
      .andWhere('role.key = :key', { key: SYSTEM_ROLE_TENANT_ADMIN })
      .select('mr.membership_id', 'membershipId')
      .getRawMany<{ membershipId: string }>();
    return rows.map((row) => row.membershipId);
  }

  async membershipHasRole(
    membershipId: string,
    roleKey: string,
  ): Promise<boolean> {
    const count = await this.membershipRoleRepository
      .createQueryBuilder('mr')
      .innerJoin(Role, 'role', 'role.id = mr.role_id')
      .where('mr.membership_id = :membershipId', { membershipId })
      .andWhere('role.key = :roleKey', { roleKey })
      .getCount();
    return count > 0;
  }

  private assertTenantLevel(memberships: MembershipRecord[]): void {
    if (!hasTenantLevelMembership(memberships)) {
      throw new AccessForbiddenException(
        'Only tenant-level members can manage tenant-wide roles',
      );
    }
  }

  private async requireTenantRole(
    tenantId: string,
    roleId: string,
  ): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, tenant_id: tenantId },
    });
    if (!role) {
      throw new ResourceNotFoundException('Role not found');
    }
    return role;
  }

  private async rolesForMembership(
    membershipId: string,
  ): Promise<RoleSummary[]> {
    const mapped = await this.listRolesByMembershipIds([membershipId]);
    return mapped.get(membershipId) ?? [];
  }

  private async ensureSystemRole(
    manager: EntityManager,
    tenantId: string,
    key: string,
    name: string,
    description: string,
  ): Promise<Role> {
    const repository = manager.getRepository(Role);
    const existing = await repository.findOne({
      where: { tenant_id: tenantId, key },
    });
    if (existing) {
      return existing;
    }
    return repository.save(
      repository.create({
        tenant_id: tenantId,
        key,
        name,
        description,
        is_system: true,
      }),
    );
  }

  private async replaceRolePermissions(
    manager: EntityManager,
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    const repository = manager.getRepository(RolePermission);
    await repository.delete({ role_id: roleId });
    if (permissionIds.length === 0) {
      return;
    }
    await repository.save(
      permissionIds.map((permissionId) =>
        repository.create({
          role_id: roleId,
          permission_id: permissionId,
        }),
      ),
    );
  }

  private async resolvePermissionIds(keys: string[]): Promise<string[]> {
    const unique = [...new Set(keys)];
    if (unique.length === 0) {
      throw new InvalidRequestException('At least one permission is required');
    }
    const unknown = unique.filter(
      (key) => !ALL_PERMISSION_KEYS.includes(key as PermissionKey),
    );
    if (unknown.length > 0) {
      throw new InvalidRequestException('Unknown permission key');
    }
    const permissions = await this.permissionRepository.find({
      where: { key: In(unique) },
    });
    if (permissions.length !== unique.length) {
      throw new InvalidRequestException('Unknown permission key');
    }
    return permissions.map((permission) => permission.id);
  }

  private async mapRoles(roles: Role[]): Promise<RoleResponse[]> {
    if (roles.length === 0) {
      return [];
    }
    const assignments = await this.rolePermissionRepository.find({
      where: { role_id: In(roles.map((role) => role.id)) },
    });
    const permissionIds = [
      ...new Set(assignments.map((row) => row.permission_id)),
    ];
    const permissions =
      permissionIds.length === 0
        ? []
        : await this.permissionRepository.find({
            where: { id: In(permissionIds) },
          });
    const permissionById = new Map(
      permissions.map((permission) => [permission.id, permission.key]),
    );
    const keysByRole = new Map<string, string[]>();
    for (const assignment of assignments) {
      const key = permissionById.get(assignment.permission_id);
      if (!key) {
        continue;
      }
      const list = keysByRole.get(assignment.role_id) ?? [];
      list.push(key);
      keysByRole.set(assignment.role_id, list);
    }

    return roles.map((role) => ({
      id: role.id,
      customerId: role.tenant_id,
      key: role.key,
      name: role.name,
      description: role.description,
      isSystem: role.is_system,
      permissionKeys: (keysByRole.get(role.id) ?? []).sort(),
      createdAt: role.created_at.toISOString(),
      updatedAt: role.updated_at.toISOString(),
    }));
  }

  private normalizeRoleKey(value: string): string {
    const key = slugify(
      value,
      `role-${randomBytes(4).toString('hex')}`,
    ).replace(/-/g, '_');
    if (key === SYSTEM_ROLE_TENANT_ADMIN || key === SYSTEM_ROLE_MEMBER) {
      throw new ResourceConflictException('System role keys are reserved');
    }
    return key;
  }
}
