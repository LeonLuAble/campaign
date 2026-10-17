import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { DataSource, In, Repository } from 'typeorm';
import {
  AccessForbiddenException,
  InvalidRequestException,
  ResourceConflictException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import { isUniqueViolation } from '../../../shared/database/postgres-errors.js';
import { slugify } from '../../../shared/text/slugify.js';
import { RegistrationService } from '../../auth/application/registration.service.js';
import {
  MEMBERSHIP_SERVICE,
  type MembershipRecord,
  type TenantRecord,
} from '../../authorization/application/access-readers.js';
import { AuthorizationService } from '../../authorization/application/authorization.service.js';
import type { RoleSummary } from '../../authorization/application/authorization.service.js';
import { hasTenantLevelMembership } from '../../authorization/application/membership-scope.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { SYSTEM_ROLE_TENANT_ADMIN } from '../../authorization/domain/permission-keys.js';
import { CredentialService } from '../../identity/application/credential.service.js';
import {
  IdentityAccountService,
  IdentityAlreadyExistsError,
} from '../../identity/application/identity-account.service.js';
import { IdentityType } from '../../identity/domain/user-identity.entity.js';
import type { MembershipService } from '../../memberships/application/membership.service.js';
import { Membership } from '../../memberships/domain/membership.entity.js';
import { Tenant } from '../domain/tenant.entity.js';
import {
  toCustomerResponse,
  type CustomerResponse,
} from './customer.mapper.js';

export interface CreateCustomerInitialAdmin {
  displayName?: string;
  email: string;
  locale?: string;
}

export interface CreateCustomerInput {
  name: string;
  initialAdminUserId?: string;
  initialAdmin?: CreateCustomerInitialAdmin;
}

export interface InvitePlatformAdminInput {
  email: string;
  displayName?: string;
  locale?: string;
}

export interface CustomerAccessResponse {
  roles: RoleSummary[];
  permissionKeys: string[];
  isTenantLevel: boolean;
  communityIds: string[];
}

export interface PlatformCustomerSummary {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  adminCount: number;
  pendingAdminInvites: number;
}

export interface PlatformAdminInviteResult {
  customerId: string;
  userId: string;
  email: string;
  activationStatus: 'pending' | 'active';
  activationToken?: string;
}

type ActivationTarget = {
  userId: string;
  identityId: string;
  identifier: string;
  type: string;
  needsToken: boolean;
  createPending?: {
    displayName: string | null;
    email: string;
    normalizedEmail: string;
    locale?: string | null;
  };
};

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly dataSource: DataSource,
    @Inject(MEMBERSHIP_SERVICE)
    private readonly memberships: MembershipService,
    @Inject(forwardRef(() => AuthorizationService))
    private readonly authorization: AuthorizationService,
    private readonly identities: IdentityAccountService,
    private readonly credentials: CredentialService,
    private readonly registration: RegistrationService,
  ) {}

  async findById(id: string): Promise<TenantRecord | null> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      return null;
    }
    return { id: tenant.id, isActive: tenant.is_active };
  }

  async listForUser(userId: string): Promise<CustomerResponse[]> {
    const tenantIds = await this.memberships.listTenantIdsForUser(userId);
    if (tenantIds.length === 0) {
      return [];
    }
    const tenants = await this.tenantRepository.find({
      where: { id: In(tenantIds) },
      order: { created_at: 'ASC' },
    });
    return tenants.map((tenant) => toCustomerResponse(tenant));
  }

  async listPlatformCustomers(
    actorUserId: string,
  ): Promise<PlatformCustomerSummary[]> {
    await this.requirePlatformAdmin(actorUserId);
    const rows = await this.dataSource.query<
      Array<{
        id: string;
        name: string;
        slug: string;
        is_active: boolean;
        created_at: Date;
        admin_count: string;
        pending_admin_invites: string;
      }>
    >(
      `
      SELECT
        t.id,
        t.name,
        t.slug,
        t.is_active,
        t.created_at,
        COUNT(DISTINCT CASE
          WHEN m.is_active = true AND r.key = $1 THEN m.user_id
        END)::text AS admin_count,
        COUNT(DISTINCT CASE
          WHEN m.is_active = true
            AND r.key = $1
            AND NOT EXISTS (
              SELECT 1
              FROM user_identities ui
              WHERE ui.user_id = m.user_id
                AND ui.is_verified = true
            )
          THEN m.user_id
        END)::text AS pending_admin_invites
      FROM tenants t
      LEFT JOIN memberships m ON m.tenant_id = t.id
      LEFT JOIN membership_roles mr ON mr.membership_id = m.id
      LEFT JOIN roles r ON r.id = mr.role_id
      GROUP BY t.id
      ORDER BY t.created_at ASC
      `,
      [SYSTEM_ROLE_TENANT_ADMIN],
    );

    this.logger.log({
      msg: 'platform_customers_listed',
      actorUserId,
      count: rows.length,
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      isActive: row.is_active,
      createdAt: new Date(row.created_at).toISOString(),
      adminCount: Number(row.admin_count),
      pendingAdminInvites: Number(row.pending_admin_invites),
    }));
  }

  async getForUser(
    userId: string,
    customerId: string,
  ): Promise<CustomerResponse> {
    const memberships = await this.memberships.listActiveForUserInTenant(
      userId,
      customerId,
    );
    if (memberships.length === 0) {
      throw new ResourceNotFoundException('Customer not found');
    }
    const tenant = await this.tenantRepository.findOne({
      where: { id: customerId },
    });
    if (!tenant) {
      throw new ResourceNotFoundException('Customer not found');
    }
    return toCustomerResponse(tenant);
  }

  async getAccess(tenant: TenantContext): Promise<CustomerAccessResponse> {
    const rolesByMembership =
      await this.authorization.listRolesByMembershipIds(
        tenant.memberships.map((membership) => membership.id),
      );
    const rolesById = new Map<string, RoleSummary>();
    for (const roles of rolesByMembership.values()) {
      for (const role of roles) {
        rolesById.set(role.id, role);
      }
    }
    return {
      roles: [...rolesById.values()].sort((left, right) =>
        left.key.localeCompare(right.key),
      ),
      permissionKeys: [...tenant.permissions].sort(),
      isTenantLevel: hasTenantLevelMembership(tenant.memberships),
      communityIds: [
        ...new Set(
          tenant.memberships
            .filter(
              (membership) =>
                membership.isActive && membership.communityId != null,
            )
            .map((membership) => membership.communityId as string),
        ),
      ].sort(),
    };
  }

  async findBySlug(slug: string): Promise<CustomerResponse | null> {
    const tenant = await this.tenantRepository.findOne({ where: { slug } });
    return tenant ? toCustomerResponse(tenant) : null;
  }

  async create(
    creatorUserId: string,
    input: CreateCustomerInput | string,
    initialAdminUserId?: string,
  ): Promise<CustomerResponse> {
    const normalized: CreateCustomerInput =
      typeof input === 'string'
        ? { name: input, initialAdminUserId }
        : input;

    await this.requirePlatformAdmin(creatorUserId);
    const trimmed = normalized.name.trim();
    if (!trimmed) {
      throw new InvalidRequestException('name is required');
    }
    if (normalized.initialAdminUserId && normalized.initialAdmin) {
      throw new InvalidRequestException(
        'Provide either initialAdminUserId or initialAdmin, not both',
      );
    }

    let resolvedAdminUserId = creatorUserId;
    let activationIdentity: ActivationTarget | undefined;

    if (normalized.initialAdminUserId) {
      if (!(await this.identities.isUserActive(normalized.initialAdminUserId))) {
        throw new ResourceNotFoundException('User not found');
      }
      resolvedAdminUserId = normalized.initialAdminUserId;
    } else if (normalized.initialAdmin) {
      activationIdentity = await this.resolveAdminByEmail(
        normalized.initialAdmin,
      );
      if (!activationIdentity.createPending) {
        resolvedAdminUserId = activationIdentity.userId;
      }
    } else if (!(await this.identities.isUserActive(creatorUserId))) {
      throw new ResourceNotFoundException('User not found');
    }

    const baseSlug = slugify(
      trimmed,
      `customer-${randomBytes(4).toString('hex')}`,
    );

    try {
      const created = await this.dataSource.transaction(async (manager) => {
        const tenantRepository = manager.getRepository(Tenant);
        let tenant: Tenant | null = null;
        const slugCandidates = [
          baseSlug,
          `${baseSlug.slice(0, 71)}-${randomBytes(4).toString('hex')}`,
          `customer-${randomBytes(6).toString('hex')}`,
        ];

        for (const slug of slugCandidates) {
          try {
            tenant = await tenantRepository.save(
              tenantRepository.create({
                name: trimmed,
                slug,
                is_active: true,
              }),
            );
            break;
          } catch (error) {
            if (isUniqueViolation(error)) {
              continue;
            }
            throw error;
          }
        }

        if (!tenant) {
          throw new ResourceConflictException(
            'Unable to allocate a unique customer slug',
          );
        }

        let tenantAdminUserId = resolvedAdminUserId;
        let resolvedActivation = activationIdentity;
        if (resolvedActivation?.createPending) {
          const createdAccount =
            await this.identities.createImportedAccountInTransaction(manager, {
              firstName: null,
              lastName: null,
              displayName: resolvedActivation.createPending.displayName,
              locale: resolvedActivation.createPending.locale ?? null,
              identities: [
                {
                  type: IdentityType.EMAIL,
                  identifier: resolvedActivation.createPending.email,
                  normalizedIdentifier:
                    resolvedActivation.createPending.normalizedEmail,
                },
              ],
            });
          tenantAdminUserId = createdAccount.userId;
          resolvedActivation = {
            userId: createdAccount.userId,
            identityId: createdAccount.identities[0].id,
            identifier: createdAccount.identities[0].identifier,
            type: createdAccount.identities[0].type,
            needsToken: true,
          };
        }

        await this.authorization.seedSystemRoles(manager, tenant.id);
        const membership = await this.memberships.createInTransaction(manager, {
          tenantId: tenant.id,
          userId: tenantAdminUserId,
          communityId: null,
        });
        const adminRole = await this.authorization.findSystemRole(
          manager,
          tenant.id,
          SYSTEM_ROLE_TENANT_ADMIN,
        );
        await this.authorization.assignRoleInTransaction(
          manager,
          membership.id,
          adminRole.id,
        );

        this.logger.log({
          msg: 'customer_created',
          tenantId: tenant.id,
          creatorUserId,
          tenantAdminUserId,
          initialAdminPending: Boolean(resolvedActivation?.needsToken),
        });
        return {
          customer: toCustomerResponse(tenant),
          tenantName: tenant.name,
          activation: resolvedActivation,
        };
      });

      const activationToken = await this.notifyAfterAdminAssignment({
        customerId: created.customer.id,
        customerName: created.tenantName,
        activation: created.activation,
        event: 'customer_created',
      });

      return activationToken
        ? { ...created.customer, activationToken }
        : created.customer;
    } catch (error) {
      if (error instanceof IdentityAlreadyExistsError) {
        throw new ResourceConflictException('Identity already exists');
      }
      throw error;
    }
  }

  async invitePlatformAdmin(
    actorUserId: string,
    customerId: string,
    input: InvitePlatformAdminInput,
  ): Promise<PlatformAdminInviteResult> {
    await this.requirePlatformAdmin(actorUserId);
    const tenant = await this.tenantRepository.findOne({
      where: { id: customerId },
    });
    if (!tenant) {
      throw new ResourceNotFoundException('Customer not found');
    }

    const activation = await this.resolveAdminByEmail(input);

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        let target = activation;
        let userId = target.userId;

        if (target.createPending) {
          const createdAccount =
            await this.identities.createImportedAccountInTransaction(manager, {
              firstName: null,
              lastName: null,
              displayName: target.createPending.displayName,
              locale: target.createPending.locale ?? null,
              identities: [
                {
                  type: IdentityType.EMAIL,
                  identifier: target.createPending.email,
                  normalizedIdentifier: target.createPending.normalizedEmail,
                },
              ],
            });
          userId = createdAccount.userId;
          target = {
            userId: createdAccount.userId,
            identityId: createdAccount.identities[0].id,
            identifier: createdAccount.identities[0].identifier,
            type: createdAccount.identities[0].type,
            needsToken: true,
          };
        }

        const membershipRepo = manager.getRepository(Membership);
        let membership = await membershipRepo
          .createQueryBuilder('m')
          .where('m.tenant_id = :tenantId', { tenantId: tenant.id })
          .andWhere('m.user_id = :userId', { userId })
          .andWhere('m.community_id IS NULL')
          .andWhere('m.is_active = true')
          .getOne();
        if (!membership) {
          membership = await this.memberships.createInTransaction(manager, {
            tenantId: tenant.id,
            userId,
            communityId: null,
          });
        }

        const adminRole = await this.authorization.findSystemRole(
          manager,
          tenant.id,
          SYSTEM_ROLE_TENANT_ADMIN,
        );
        await this.authorization.assignRoleInTransaction(
          manager,
          membership.id,
          adminRole.id,
        );

        this.logger.log({
          msg: 'platform_admin_invited',
          tenantId: tenant.id,
          actorUserId,
          userId,
          pending: target.needsToken,
        });

        return { userId, activation: target };
      });

      const activationToken = await this.notifyAfterAdminAssignment({
        customerId: tenant.id,
        customerName: tenant.name,
        activation: result.activation,
        event: 'platform_admin_invited',
      });

      return {
        customerId: tenant.id,
        userId: result.userId,
        email: result.activation.identifier,
        activationStatus: result.activation.needsToken ? 'pending' : 'active',
        ...(activationToken ? { activationToken } : {}),
      };
    } catch (error) {
      if (error instanceof IdentityAlreadyExistsError) {
        throw new ResourceConflictException('Identity already exists');
      }
      throw error;
    }
  }

  async resendPlatformAdminActivation(
    actorUserId: string,
    customerId: string,
    userId: string,
  ): Promise<{ accepted: true }> {
    await this.requirePlatformAdmin(actorUserId);
    const tenant = await this.tenantRepository.findOne({
      where: { id: customerId },
    });
    if (!tenant) {
      throw new ResourceNotFoundException('Customer not found');
    }

    const rows = await this.dataSource.query<
      Array<{ email: string; is_verified: boolean }>
    >(
      `
      SELECT ui.identifier AS email, ui.is_verified
      FROM memberships m
      INNER JOIN membership_roles mr ON mr.membership_id = m.id
      INNER JOIN roles r ON r.id = mr.role_id
      INNER JOIN user_identities ui ON ui.user_id = m.user_id AND ui.type = 'email'
      WHERE m.tenant_id = $1
        AND m.user_id = $2
        AND m.is_active = true
        AND r.key = $3
      LIMIT 1
      `,
      [customerId, userId, SYSTEM_ROLE_TENANT_ADMIN],
    );
    const row = rows[0];
    if (!row) {
      throw new ResourceNotFoundException('Admin not found');
    }

    try {
      await this.registration.sendActivationInvitation(row.email);
    } catch (error) {
      this.logger.error({
        msg: 'platform_admin_activation_resend_failed',
        tenantId: customerId,
        actorUserId,
        userId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }

    this.logger.log({
      msg: 'platform_admin_activation_resent',
      tenantId: customerId,
      actorUserId,
      userId,
      alreadyVerified: row.is_verified,
    });
    return { accepted: true };
  }

  async update(
    customerId: string,
    input: { name?: string; isActive?: boolean },
    memberships: MembershipRecord[],
  ): Promise<CustomerResponse> {
    if (!hasTenantLevelMembership(memberships)) {
      throw new AccessForbiddenException(
        'Only tenant-level members can update a customer',
      );
    }
    const tenant = await this.tenantRepository.findOne({
      where: { id: customerId },
    });
    if (!tenant) {
      throw new ResourceNotFoundException('Customer not found');
    }
    if (input.name !== undefined) {
      tenant.name = input.name.trim();
    }
    if (input.isActive !== undefined) {
      tenant.is_active = input.isActive;
    }
    const saved = await this.tenantRepository.save(tenant);
    this.logger.log({
      msg: 'customer_updated',
      tenantId: saved.id,
      isActive: saved.is_active,
    });
    return toCustomerResponse(saved);
  }

  async requireActive(customerId: string): Promise<void> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: customerId },
    });
    if (!tenant?.is_active) {
      throw new ResourceNotFoundException('Customer not found');
    }
  }

  private async requirePlatformAdmin(userId: string): Promise<void> {
    if (!(await this.identities.isPlatformAdmin(userId))) {
      throw new AccessForbiddenException(
        'Only platform admins can perform this action',
      );
    }
  }

  private async resolveAdminByEmail(input: {
    email: string;
    displayName?: string;
    locale?: string;
  }): Promise<ActivationTarget> {
    const email = input.email.trim();
    if (!email) {
      throw new InvalidRequestException('email is required');
    }
    let normalizedEmail: string;
    try {
      normalizedEmail = this.credentials.normalizeEmail(email);
    } catch {
      throw new InvalidRequestException('email is invalid');
    }
    const existing = await this.identities.findIdentity(
      IdentityType.EMAIL,
      normalizedEmail,
    );
    if (existing) {
      if (!existing.isActive) {
        throw new ResourceNotFoundException('User not found');
      }
      return {
        userId: existing.userId,
        identityId: existing.identityId,
        identifier: existing.identifier,
        type: existing.type,
        needsToken: !existing.isVerified,
      };
    }
    return {
      userId: '',
      identityId: '',
      identifier: email,
      type: IdentityType.EMAIL,
      needsToken: true,
      createPending: {
        displayName: input.displayName?.trim() || null,
        email,
        normalizedEmail,
        locale: input.locale ?? null,
      },
    };
  }

  private async notifyAfterAdminAssignment(input: {
    customerId: string;
    customerName: string;
    activation?: ActivationTarget;
    event: string;
  }): Promise<string | undefined> {
    const target = input.activation;
    if (!target) {
      return undefined;
    }

    if (target.needsToken) {
      try {
        const token = await this.registration.issueActivationTokenForIdentity({
          userId: target.userId,
          identityId: target.identityId,
          identifier: target.identifier,
          type: target.type,
        });
        this.logger.log({
          msg: 'customer_admin_activation_sent',
          tenantId: input.customerId,
          event: input.event,
          userId: target.userId,
        });
        return token;
      } catch (error) {
        this.logger.error({
          msg: 'customer_admin_activation_send_failed',
          tenantId: input.customerId,
          event: input.event,
          userId: target.userId,
          error: error instanceof Error ? error.message : 'unknown',
        });
        return undefined;
      }
    }

    try {
      await this.registration.sendCustomerAddedNotice({
        userId: target.userId,
        email: target.identifier,
        customerName: input.customerName,
      });
      this.logger.log({
        msg: 'customer_admin_added_notice_sent',
        tenantId: input.customerId,
        event: input.event,
        userId: target.userId,
      });
    } catch (error) {
      this.logger.error({
        msg: 'customer_admin_added_notice_send_failed',
        tenantId: input.customerId,
        event: input.event,
        userId: target.userId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
    return undefined;
  }
}
