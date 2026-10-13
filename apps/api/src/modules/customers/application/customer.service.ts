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
import type {
  MembershipRecord,
  TenantRecord,
} from '../../authorization/application/access-readers.js';
import { AuthorizationService } from '../../authorization/application/authorization.service.js';
import { hasTenantLevelMembership } from '../../authorization/application/membership-scope.js';
import { SYSTEM_ROLE_TENANT_ADMIN } from '../../authorization/domain/permission-keys.js';
import { MembershipService } from '../../memberships/application/membership.service.js';
import { Tenant } from '../domain/tenant.entity.js';
import {
  toCustomerResponse,
  type CustomerResponse,
} from './customer.mapper.js';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => MembershipService))
    private readonly memberships: MembershipService,
    @Inject(forwardRef(() => AuthorizationService))
    private readonly authorization: AuthorizationService,
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
    return tenants.map(toCustomerResponse);
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

  async create(userId: string, name: string): Promise<CustomerResponse> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new InvalidRequestException('name is required');
    }
    const baseSlug = slugify(
      trimmed,
      `customer-${randomBytes(4).toString('hex')}`,
    );

    return this.dataSource.transaction(async (manager) => {
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

      await this.authorization.seedSystemRoles(manager, tenant.id);
      const membership = await this.memberships.createInTransaction(manager, {
        tenantId: tenant.id,
        userId,
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
        userId,
      });
      return toCustomerResponse(tenant);
    });
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
