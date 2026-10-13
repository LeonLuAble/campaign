import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
import type { MembershipRecord } from '../../authorization/application/access-readers.js';
import { AuthorizationService } from '../../authorization/application/authorization.service.js';
import type { RoleSummary } from '../../authorization/application/authorization.service.js';
import { hasTenantLevelMembership } from '../../authorization/application/membership-scope.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { SYSTEM_ROLE_TENANT_ADMIN } from '../../authorization/domain/permission-keys.js';
import { CommunityService } from '../../communities/application/community.service.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import { Membership } from '../domain/membership.entity.js';

export interface MembershipResponse {
  id: string;
  customerId: string;
  userId: string;
  communityId: string | null;
  isActive: boolean;
  roles: RoleSummary[];
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @Inject(forwardRef(() => AuthorizationService))
    private readonly authorization: AuthorizationService,
    @Inject(forwardRef(() => CustomerService))
    private readonly customers: CustomerService,
    @Inject(forwardRef(() => CommunityService))
    private readonly communities: CommunityService,
    private readonly identities: IdentityAccountService,
  ) {}

  async findById(id: string): Promise<MembershipRecord | null> {
    const membership = await this.membershipRepository.findOne({
      where: { id },
    });
    return membership ? this.toRecord(membership) : null;
  }

  async listByIds(ids: string[]): Promise<MembershipRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    const memberships = await this.membershipRepository.find({
      where: { id: In(ids) },
    });
    return memberships.map((membership) => this.toRecord(membership));
  }

  async listActiveForUserInTenant(
    userId: string,
    tenantId: string,
  ): Promise<MembershipRecord[]> {
    const memberships = await this.membershipRepository.find({
      where: { user_id: userId, tenant_id: tenantId, is_active: true },
    });
    return memberships.map((membership) => this.toRecord(membership));
  }

  async listActiveForUser(userId: string): Promise<MembershipRecord[]> {
    const memberships = await this.membershipRepository.find({
      where: { user_id: userId, is_active: true },
    });
    return memberships.map((membership) => this.toRecord(membership));
  }

  async listTenantIdsForUser(userId: string): Promise<string[]> {
    const memberships = await this.membershipRepository.find({
      where: { user_id: userId, is_active: true },
      select: ['tenant_id'],
    });
    return [...new Set(memberships.map((membership) => membership.tenant_id))];
  }

  async createInTransaction(
    manager: EntityManager,
    input: { tenantId: string; userId: string; communityId: string | null },
  ): Promise<Membership> {
    const repository = manager.getRepository(Membership);
    try {
      return await repository.save(
        repository.create({
          tenant_id: input.tenantId,
          user_id: input.userId,
          community_id: input.communityId,
          is_active: true,
        }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ResourceConflictException('Membership already exists');
      }
      if (isRaiseException(error)) {
        throw new InvalidRequestException(
          'Community must belong to the same customer',
        );
      }
      throw error;
    }
  }

  async list(tenant: TenantContext): Promise<MembershipResponse[]> {
    const memberships = await this.membershipRepository.find({
      where: { tenant_id: tenant.tenantId },
      order: { created_at: 'ASC' },
    });
    const visible = await this.visibleCommunityIdSet(tenant);
    const filtered = memberships.filter((membership) => {
      if (hasTenantLevelMembership(tenant.memberships)) {
        return true;
      }
      if (!membership.community_id) {
        return false;
      }
      return visible.has(membership.community_id);
    });
    return this.toResponses(filtered);
  }

  async get(
    tenant: TenantContext,
    membershipId: string,
  ): Promise<MembershipResponse> {
    const membership = await this.requireVisible(tenant, membershipId);
    const [response] = await this.toResponses([membership]);
    return response;
  }

  async create(
    tenant: TenantContext,
    input: { userId: string; communityId?: string | null },
  ): Promise<MembershipResponse> {
    await this.customers.requireActive(tenant.tenantId);
    const communityId = input.communityId ?? null;
    if (communityId) {
      await this.communities.get(tenant, communityId);
    } else if (!hasTenantLevelMembership(tenant.memberships)) {
      throw new AccessForbiddenException(
        'Only tenant-level members can create tenant-level memberships',
      );
    }

    const userActive = await this.identities.isUserActive(input.userId);
    if (!userActive) {
      throw new ResourceNotFoundException('User not found');
    }

    const saved = await this.createInTransaction(
      this.membershipRepository.manager,
      {
        tenantId: tenant.tenantId,
        userId: input.userId,
        communityId,
      },
    );
    this.logger.log({
      msg: 'membership_created',
      tenantId: tenant.tenantId,
      membershipId: saved.id,
      userId: input.userId,
    });
    const [response] = await this.toResponses([saved]);
    return response;
  }

  async update(
    tenant: TenantContext,
    membershipId: string,
    input: { isActive?: boolean },
  ): Promise<MembershipResponse> {
    await this.customers.requireActive(tenant.tenantId);
    const membership = await this.requireVisible(tenant, membershipId);
    if (input.isActive === false && membership.is_active) {
      await this.assertNotLastTenantAdmin(tenant.tenantId, membership);
      membership.is_active = false;
    } else if (input.isActive === true) {
      membership.is_active = true;
    }
    const saved = await this.membershipRepository.save(membership);
    this.logger.log({
      msg: 'membership_updated',
      tenantId: tenant.tenantId,
      membershipId: saved.id,
      isActive: saved.is_active,
    });
    const [response] = await this.toResponses([saved]);
    return response;
  }

  async deactivate(tenant: TenantContext, membershipId: string): Promise<void> {
    await this.update(tenant, membershipId, { isActive: false });
  }

  async listRoles(
    tenant: TenantContext,
    membershipId: string,
  ): Promise<RoleSummary[]> {
    const membership = await this.requireVisible(tenant, membershipId);
    const mapped = await this.authorization.listRolesByMembershipIds([
      membership.id,
    ]);
    return mapped.get(membership.id) ?? [];
  }

  async assignRole(
    tenant: TenantContext,
    membershipId: string,
    roleId: string,
  ): Promise<RoleSummary[]> {
    await this.customers.requireActive(tenant.tenantId);
    const membership = await this.requireVisible(tenant, membershipId);
    return this.authorization.assignRole(
      tenant.tenantId,
      membership.id,
      membership.tenant_id,
      roleId,
    );
  }

  async unassignRole(
    tenant: TenantContext,
    membershipId: string,
    roleId: string,
  ): Promise<RoleSummary[]> {
    await this.customers.requireActive(tenant.tenantId);
    const membership = await this.requireVisible(tenant, membershipId);
    const isAdmin = await this.authorization.membershipHasRole(
      membership.id,
      SYSTEM_ROLE_TENANT_ADMIN,
    );
    if (isAdmin && membership.is_active && membership.community_id === null) {
      await this.assertNotLastTenantAdmin(tenant.tenantId, membership);
    }
    return this.authorization.unassignRole(
      tenant.tenantId,
      membership.id,
      membership.tenant_id,
      roleId,
    );
  }

  private async assertNotLastTenantAdmin(
    tenantId: string,
    membership: Membership,
  ): Promise<void> {
    const isAdmin = await this.authorization.membershipHasRole(
      membership.id,
      SYSTEM_ROLE_TENANT_ADMIN,
    );
    if (!isAdmin || membership.community_id !== null) {
      return;
    }
    const adminIds =
      await this.authorization.listTenantAdminMembershipIds(tenantId);
    const admins = await this.listByIds(adminIds);
    const remaining = admins.filter(
      (candidate) =>
        candidate.id !== membership.id &&
        candidate.isActive &&
        candidate.communityId === null,
    );
    if (remaining.length === 0) {
      throw new AccessForbiddenException('Cannot remove the last tenant admin');
    }
  }

  private async requireVisible(
    tenant: TenantContext,
    membershipId: string,
  ): Promise<Membership> {
    const membership = await this.membershipRepository.findOne({
      where: { id: membershipId, tenant_id: tenant.tenantId },
    });
    if (!membership) {
      throw new ResourceNotFoundException('Membership not found');
    }
    if (hasTenantLevelMembership(tenant.memberships)) {
      return membership;
    }
    if (!membership.community_id) {
      throw new ResourceNotFoundException('Membership not found');
    }
    const visible = await this.visibleCommunityIdSet(tenant);
    if (!visible.has(membership.community_id)) {
      throw new ResourceNotFoundException('Membership not found');
    }
    return membership;
  }

  private async visibleCommunityIdSet(
    tenant: TenantContext,
  ): Promise<Set<string>> {
    const communities = await this.communities.list(tenant);
    return new Set(communities.map((community) => community.id));
  }

  private async toResponses(
    memberships: Membership[],
  ): Promise<MembershipResponse[]> {
    const roles = await this.authorization.listRolesByMembershipIds(
      memberships.map((membership) => membership.id),
    );
    return memberships.map((membership) => ({
      id: membership.id,
      customerId: membership.tenant_id,
      userId: membership.user_id,
      communityId: membership.community_id,
      isActive: membership.is_active,
      roles: roles.get(membership.id) ?? [],
      createdAt: membership.created_at.toISOString(),
      updatedAt: membership.updated_at.toISOString(),
    }));
  }

  private toRecord(membership: Membership): MembershipRecord {
    return {
      id: membership.id,
      tenantId: membership.tenant_id,
      userId: membership.user_id,
      communityId: membership.community_id,
      isActive: membership.is_active,
    };
  }
}
