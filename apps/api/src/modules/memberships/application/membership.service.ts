import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
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
import {
  COMMUNITY_SERVICE,
  TENANT_READER,
  type MembershipRecord,
  type TenantReader,
} from '../../authorization/application/access-readers.js';
import { AuthorizationService } from '../../authorization/application/authorization.service.js';
import type { RoleSummary } from '../../authorization/application/authorization.service.js';
import { hasTenantLevelMembership } from '../../authorization/application/membership-scope.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import {
  SYSTEM_ROLE_MEMBER,
  SYSTEM_ROLE_TENANT_ADMIN,
} from '../../authorization/domain/permission-keys.js';
import type { CommunityService } from '../../communities/application/community.service.js';
import {
  IdentityAccountService,
  type PublicUserProfile,
} from '../../identity/application/identity-account.service.js';
import { Membership } from '../domain/membership.entity.js';
import {
  buildMembershipUserSummary,
  decodeMembershipCursor,
  encodeMembershipCursor,
  escapeIlikePattern,
  type MembershipUserSummary,
} from './membership-directory.js';
import {
  MEMBERSHIP_LIFECYCLE_LISTENER,
  type MembershipLifecycleListener,
} from './membership-lifecycle.js';

export interface MembershipCommunitySummary {
  id: string;
  name: string;
}

export interface MembershipResponse {
  id: string;
  customerId: string;
  userId: string;
  communityId: string | null;
  isActive: boolean;
  roles: RoleSummary[];
  user?: MembershipUserSummary;
  community?: MembershipCommunitySummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListMembershipsQuery {
  q?: string;
  communityId?: string;
  includeDescendants?: boolean;
  roleKey?: string;
  status?: 'pending' | 'active';
  limit?: number;
  cursor?: string;
}

export interface MembershipListPage {
  items: MembershipResponse[];
  nextCursor: string | null;
}

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @Inject(forwardRef(() => AuthorizationService))
    private readonly authorization: AuthorizationService,
    @Inject(TENANT_READER)
    private readonly tenants: TenantReader,
    @Inject(COMMUNITY_SERVICE)
    private readonly communities: CommunityService,
    private readonly identities: IdentityAccountService,
    @Optional()
    @Inject(MEMBERSHIP_LIFECYCLE_LISTENER)
    private readonly membershipLifecycle: MembershipLifecycleListener | null,
  ) {}

  private async requireActiveCustomer(customerId: string): Promise<void> {
    const tenant = await this.tenants.findById(customerId);
    if (!tenant?.isActive) {
      throw new ResourceNotFoundException('Customer not found');
    }
  }

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

  async listActiveInTenant(tenantId: string): Promise<MembershipRecord[]> {
    const memberships = await this.membershipRepository.find({
      where: { tenant_id: tenantId, is_active: true },
      order: { created_at: 'ASC' },
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

  async list(
    tenant: TenantContext,
    query: ListMembershipsQuery = {},
  ): Promise<MembershipListPage> {
    const isTenantLevel = hasTenantLevelMembership(tenant.memberships);
    const visible = await this.visibleCommunityIdSet(tenant);
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);

    let communityFilterIds: string[] | null = null;
    if (query.communityId) {
      await this.communities.get(tenant, query.communityId);
      communityFilterIds = [query.communityId];
      if (query.includeDescendants) {
        const descendants = await this.communities.listDescendantIds(
          query.communityId,
        );
        communityFilterIds = [query.communityId, ...descendants];
      }
      if (!isTenantLevel) {
        communityFilterIds = communityFilterIds.filter((id) =>
          visible.has(id),
        );
      }
      if (communityFilterIds.length === 0) {
        return { items: [], nextCursor: null };
      }
    }

    const qb = this.membershipRepository
      .createQueryBuilder('m')
      .where('m.tenant_id = :tenantId', { tenantId: tenant.tenantId });

    if (!isTenantLevel) {
      if (visible.size === 0) {
        return { items: [], nextCursor: null };
      }
      qb.andWhere('m.community_id IN (:...visibleCommunityIds)', {
        visibleCommunityIds: [...visible],
      });
    }

    if (communityFilterIds) {
      qb.andWhere('m.community_id IN (:...communityFilterIds)', {
        communityFilterIds,
      });
    }

    if (query.roleKey?.trim()) {
      qb.innerJoin(
        'membership_roles',
        'mr_filter',
        'mr_filter.membership_id = m.id',
      ).innerJoin(
        'roles',
        'role_filter',
        'role_filter.id = mr_filter.role_id AND role_filter.tenant_id = m.tenant_id',
      );
      qb.andWhere('role_filter.key = :roleKey', {
        roleKey: query.roleKey.trim(),
      });
    }

    const search = query.q?.trim();
    if (search) {
      const pattern = `%${escapeIlikePattern(search)}%`;
      qb.leftJoin('users', 'u_search', 'u_search.id = m.user_id').leftJoin(
        'user_identities',
        'ui_search',
        'ui_search.user_id = m.user_id',
      );
      qb.andWhere(
        `(u_search.display_name ILIKE :pattern ESCAPE '\\'
          OR u_search.first_name ILIKE :pattern ESCAPE '\\'
          OR u_search.last_name ILIKE :pattern ESCAPE '\\'
          OR ui_search.identifier ILIKE :pattern ESCAPE '\\'
          OR ui_search.normalized_identifier ILIKE :pattern ESCAPE '\\')`,
        { pattern },
      );
    }

    if (query.status === 'pending') {
      qb.andWhere(
        `NOT EXISTS (
          SELECT 1 FROM user_identities ui_status
          WHERE ui_status.user_id = m.user_id AND ui_status.is_verified = true
        )`,
      );
    } else if (query.status === 'active') {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM user_identities ui_status
          WHERE ui_status.user_id = m.user_id AND ui_status.is_verified = true
        )`,
      );
    }

    if (query.cursor) {
      try {
        const decoded = decodeMembershipCursor(query.cursor);
        qb.andWhere(
          `(m.created_at > :cursorCreatedAt
            OR (m.created_at = :cursorCreatedAt AND m.id > :cursorId))`,
          {
            cursorCreatedAt: decoded.createdAt.toISOString(),
            cursorId: decoded.id,
          },
        );
      } catch {
        throw new InvalidRequestException('cursor is invalid');
      }
    }

    qb.select('m.id', 'id')
      .addSelect('m.created_at', 'created_at')
      .distinct(true)
      .orderBy('m.created_at', 'ASC')
      .addOrderBy('m.id', 'ASC')
      .take(limit + 1);

    const rows = await qb.getRawMany<{ id: string; created_at: Date | string }>();
    const pageRows = rows.slice(0, limit);
    const membershipIds = pageRows.map((row) => row.id);
    if (membershipIds.length === 0) {
      return { items: [], nextCursor: null };
    }

    const memberships = await this.membershipRepository.find({
      where: { id: In(membershipIds) },
    });
    const byId = new Map(
      memberships.map((membership) => [membership.id, membership]),
    );
    const ordered = membershipIds
      .map((id) => byId.get(id))
      .filter((membership): membership is Membership => Boolean(membership));

    const items = await this.toResponses(ordered, {
      includeUser: true,
      includeContacts: isTenantLevel,
      includeCommunity: true,
      tenant,
    });

    const last = ordered.at(-1);
    const nextCursor =
      rows.length > limit && last
        ? encodeMembershipCursor(last.created_at, last.id)
        : null;

    return { items, nextCursor };
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
    await this.requireActiveCustomer(tenant.tenantId);
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
    await this.emitMembershipActivated({
      tenantId: tenant.tenantId,
      userId: input.userId,
      membershipId: saved.id,
    });
    const [response] = await this.toResponses([saved]);
    return response;
  }

  async update(
    tenant: TenantContext,
    membershipId: string,
    input: { isActive?: boolean },
  ): Promise<MembershipResponse> {
    await this.requireActiveCustomer(tenant.tenantId);
    const membership = await this.requireVisible(tenant, membershipId);
    const wasInactive = !membership.is_active;
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
    if (wasInactive && saved.is_active) {
      await this.emitMembershipActivated({
        tenantId: saved.tenant_id,
        userId: saved.user_id,
        membershipId: saved.id,
      });
    }
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

  async assignSystemRole(
    tenant: TenantContext,
    membershipId: string,
    roleKey: string,
  ): Promise<RoleSummary[]> {
    const role = await this.authorization.findSystemRoleByKey(
      tenant.tenantId,
      roleKey,
    );
    return this.assignRole(tenant, membershipId, role.id);
  }

  /**
   * Safe to call after invitation/import commit. Listener failures are logged
   * and never block the membership write path.
   */
  async emitMembershipActivated(event: {
    tenantId: string;
    userId: string;
    membershipId: string;
  }): Promise<void> {
    if (!this.membershipLifecycle) {
      return;
    }
    try {
      await this.membershipLifecycle.onMembershipActivated(event);
    } catch (error) {
      this.logger.error({
        msg: 'membership_lifecycle_hook_failed',
        tenantId: event.tenantId,
        membershipId: event.membershipId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  async assignRole(
    tenant: TenantContext,
    membershipId: string,
    roleId: string,
  ): Promise<RoleSummary[]> {
    await this.requireActiveCustomer(tenant.tenantId);
    const membership = await this.requireVisible(tenant, membershipId);
    const roles = await this.authorization.assignRole(
      tenant.tenantId,
      membership.id,
      membership.tenant_id,
      roleId,
    );
    if (roles.some((role) => role.key === SYSTEM_ROLE_MEMBER)) {
      await this.emitMembershipActivated({
        tenantId: membership.tenant_id,
        userId: membership.user_id,
        membershipId: membership.id,
      });
    }
    return roles;
  }

  async unassignRole(
    tenant: TenantContext,
    membershipId: string,
    roleId: string,
  ): Promise<RoleSummary[]> {
    await this.requireActiveCustomer(tenant.tenantId);
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
    options: {
      includeUser?: boolean;
      includeContacts?: boolean;
      includeCommunity?: boolean;
      tenant?: TenantContext;
    } = {},
  ): Promise<MembershipResponse[]> {
    const roles = await this.authorization.listRolesByMembershipIds(
      memberships.map((membership) => membership.id),
    );

    const profiles: Map<string, PublicUserProfile> = options.includeUser
      ? await this.identities.listProfilesByIds(
          memberships.map((membership) => membership.user_id),
        )
      : new Map();

    const communityById = new Map<string, MembershipCommunitySummary>();
    if (options.includeCommunity && options.tenant) {
      const communities = await this.communities.list(options.tenant);
      for (const community of communities) {
        communityById.set(community.id, {
          id: community.id,
          name: community.name,
        });
      }
    }

    return memberships.map((membership) => {
      const response: MembershipResponse = {
        id: membership.id,
        customerId: membership.tenant_id,
        userId: membership.user_id,
        communityId: membership.community_id,
        isActive: membership.is_active,
        roles: roles.get(membership.id) ?? [],
        createdAt: membership.created_at.toISOString(),
        updatedAt: membership.updated_at.toISOString(),
      };
      if (options.includeUser) {
        const profile = profiles.get(membership.user_id);
        response.user = buildMembershipUserSummary({
          id: membership.user_id,
          displayName: profile?.displayName ?? null,
          firstName: profile?.firstName ?? null,
          lastName: profile?.lastName ?? null,
          identities: (profile?.identities ?? []).map((identity) => ({
            type: identity.type,
            identifier: identity.identifier,
            isVerified: identity.isVerified,
          })),
          includeContacts: options.includeContacts === true,
        });
      }
      if (options.includeCommunity) {
        response.community = membership.community_id
          ? (communityById.get(membership.community_id) ?? null)
          : null;
      }
      return response;
    });
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
