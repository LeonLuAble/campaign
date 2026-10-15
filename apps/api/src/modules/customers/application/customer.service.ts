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
import { hasTenantLevelMembership } from '../../authorization/application/membership-scope.js';
import { SYSTEM_ROLE_TENANT_ADMIN } from '../../authorization/domain/permission-keys.js';
import { CredentialService } from '../../identity/application/credential.service.js';
import {
  IdentityAccountService,
  IdentityAlreadyExistsError,
} from '../../identity/application/identity-account.service.js';
import { IdentityType } from '../../identity/domain/user-identity.entity.js';
import type { MembershipService } from '../../memberships/application/membership.service.js';
import { Tenant } from '../domain/tenant.entity.js';
import {
  toCustomerResponse,
  type CustomerResponse,
} from './customer.mapper.js';

export interface CreateCustomerInitialAdmin {
  displayName?: string;
  email: string;
}

export interface CreateCustomerInput {
  name: string;
  initialAdminUserId?: string;
  initialAdmin?: CreateCustomerInitialAdmin;
}

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

    if (!(await this.identities.isPlatformAdmin(creatorUserId))) {
      throw new AccessForbiddenException(
        'Only platform admins can create customers',
      );
    }
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
    let activationIdentity:
      | {
          userId: string;
          identityId: string;
          identifier: string;
          type: string;
          needsToken: boolean;
          createPending?: {
            displayName: string | null;
            email: string;
            normalizedEmail: string;
          };
        }
      | undefined;

    if (normalized.initialAdminUserId) {
      if (!(await this.identities.isUserActive(normalized.initialAdminUserId))) {
        throw new ResourceNotFoundException('User not found');
      }
      resolvedAdminUserId = normalized.initialAdminUserId;
    } else if (normalized.initialAdmin) {
      const email = normalized.initialAdmin.email.trim();
      if (!email) {
        throw new InvalidRequestException('initialAdmin.email is required');
      }
      const normalizedEmail = this.credentials.normalizeEmail(email);
      const existing = await this.identities.findIdentity(
        IdentityType.EMAIL,
        normalizedEmail,
      );
      if (existing) {
        if (!existing.isActive) {
          throw new ResourceNotFoundException('User not found');
        }
        resolvedAdminUserId = existing.userId;
        activationIdentity = {
          userId: existing.userId,
          identityId: existing.identityId,
          identifier: existing.identifier,
          type: existing.type,
          needsToken: !existing.isVerified,
        };
      } else {
        activationIdentity = {
          userId: '',
          identityId: '',
          identifier: email,
          type: IdentityType.EMAIL,
          needsToken: true,
          createPending: {
            displayName: normalized.initialAdmin.displayName?.trim() || null,
            email,
            normalizedEmail,
          },
        };
      }
    } else if (!(await this.identities.isUserActive(creatorUserId))) {
      throw new ResourceNotFoundException('User not found');
    }

    const baseSlug = slugify(
      trimmed,
      `customer-${randomBytes(4).toString('hex')}`,
    );

    let activationToken: string | undefined;

    try {
      const customer = await this.dataSource.transaction(async (manager) => {
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
        if (activationIdentity?.createPending) {
          const created = await this.identities.createImportedAccountInTransaction(
            manager,
            {
              firstName: null,
              lastName: null,
              displayName: activationIdentity.createPending.displayName,
              identities: [
                {
                  type: IdentityType.EMAIL,
                  identifier: activationIdentity.createPending.email,
                  normalizedIdentifier:
                    activationIdentity.createPending.normalizedEmail,
                },
              ],
            },
          );
          tenantAdminUserId = created.userId;
          activationIdentity = {
            userId: created.userId,
            identityId: created.identities[0].id,
            identifier: created.identities[0].identifier,
            type: created.identities[0].type,
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
          initialAdminPending: Boolean(activationIdentity?.needsToken),
        });
        return toCustomerResponse(tenant);
      });

      if (activationIdentity?.needsToken) {
        activationToken = await this.registration.issueActivationTokenForIdentity(
          {
            userId: activationIdentity.userId,
            identityId: activationIdentity.identityId,
            identifier: activationIdentity.identifier,
            type: activationIdentity.type,
          },
        );
      }

      return activationToken
        ? { ...customer, activationToken }
        : customer;
    } catch (error) {
      if (error instanceof IdentityAlreadyExistsError) {
        throw new ResourceConflictException('Identity already exists');
      }
      throw error;
    }
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
}
