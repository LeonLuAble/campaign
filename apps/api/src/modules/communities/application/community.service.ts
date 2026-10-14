import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
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
import {
  TENANT_READER,
  type CommunityRecord,
  type TenantReader,
} from '../../authorization/application/access-readers.js';
import { hasTenantLevelMembership } from '../../authorization/application/membership-scope.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { CommunityNode } from '../domain/community-node.entity.js';
import {
  listAncestorIdsFrom,
  listDescendantIdsFrom,
  visibleCommunityIds,
  wouldCreateCycle,
} from './community-visibility.js';

export interface CommunityResponse {
  id: string;
  customerId: string;
  parentId: string | null;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  constructor(
    @InjectRepository(CommunityNode)
    private readonly communityRepository: Repository<CommunityNode>,
    @Inject(TENANT_READER)
    private readonly tenants: TenantReader,
  ) {}

  private async requireActiveCustomer(customerId: string): Promise<void> {
    const tenant = await this.tenants.findById(customerId);
    if (!tenant?.isActive) {
      throw new ResourceNotFoundException('Customer not found');
    }
  }

  async findById(id: string): Promise<CommunityRecord | null> {
    const node = await this.communityRepository.findOne({ where: { id } });
    if (!node) {
      return null;
    }
    return this.toRecord(node);
  }

  async listAncestorIds(id: string): Promise<string[]> {
    const nodes = await this.loadTenantNodesFor(id);
    if (!nodes) {
      return [];
    }
    return listAncestorIdsFrom(this.toHierarchy(nodes), id);
  }

  async listDescendantIds(id: string): Promise<string[]> {
    const nodes = await this.loadTenantNodesFor(id);
    if (!nodes) {
      return [];
    }
    return listDescendantIdsFrom(this.toHierarchy(nodes), id);
  }

  async list(tenant: TenantContext): Promise<CommunityResponse[]> {
    const nodes = await this.communityRepository.find({
      where: { tenant_id: tenant.tenantId },
      order: { created_at: 'ASC' },
    });
    const visible = visibleCommunityIds(
      this.toHierarchy(nodes),
      tenant.memberships,
    );
    return nodes
      .filter((node) => visible.has(node.id))
      .map((node) => this.toResponse(node));
  }

  async get(
    tenant: TenantContext,
    communityId: string,
  ): Promise<CommunityResponse> {
    const node = await this.requireVisible(tenant, communityId);
    return this.toResponse(node);
  }

  async create(
    tenant: TenantContext,
    input: { parentId?: string | null; name: string },
  ): Promise<CommunityResponse> {
    await this.requireActiveCustomer(tenant.tenantId);
    const parentId = input.parentId ?? null;
    if (parentId) {
      const parent = await this.requireVisible(tenant, parentId);
      if (!parent.is_active) {
        throw new InvalidRequestException('Parent community is inactive');
      }
      if (parent.tenant_id !== tenant.tenantId) {
        throw new ResourceNotFoundException('Community not found');
      }
    } else if (!hasTenantLevelMembership(tenant.memberships)) {
      throw new AccessForbiddenException(
        'Only tenant-level members can create a root community',
      );
    }

    const name = input.name.trim();
    if (!name) {
      throw new InvalidRequestException('name is required');
    }
    const node = await this.saveWithUniqueSlug({
      tenant_id: tenant.tenantId,
      parent_id: parentId,
      name,
      is_active: true,
    });
    this.logger.log({
      msg: 'community_created',
      tenantId: tenant.tenantId,
      communityId: node.id,
      parentId,
    });
    return this.toResponse(node);
  }

  async update(
    tenant: TenantContext,
    communityId: string,
    input: { name?: string; parentId?: string | null; isActive?: boolean },
  ): Promise<CommunityResponse> {
    await this.requireActiveCustomer(tenant.tenantId);
    const node = await this.requireVisible(tenant, communityId);
    const nodes = await this.communityRepository.find({
      where: { tenant_id: tenant.tenantId },
    });

    if (input.parentId !== undefined) {
      const newParentId = input.parentId;
      if (newParentId) {
        const parent = await this.requireVisible(tenant, newParentId);
        if (parent.tenant_id !== tenant.tenantId) {
          throw new ResourceNotFoundException('Community not found');
        }
      } else if (!hasTenantLevelMembership(tenant.memberships)) {
        throw new AccessForbiddenException(
          'Only tenant-level members can move a community to the root',
        );
      }
      if (wouldCreateCycle(this.toHierarchy(nodes), node.id, newParentId)) {
        throw new InvalidRequestException(
          'Community parent would create a cycle',
        );
      }
      node.parent_id = newParentId;
    }

    if (input.name !== undefined) {
      node.name = input.name.trim();
    }
    if (input.isActive !== undefined) {
      node.is_active = input.isActive;
    }

    try {
      const saved = await this.communityRepository.save(node);
      this.logger.log({
        msg: 'community_updated',
        tenantId: tenant.tenantId,
        communityId: saved.id,
      });
      return this.toResponse(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ResourceConflictException(
          'A sibling community with this slug already exists',
        );
      }
      if (isRaiseException(error)) {
        throw new InvalidRequestException(
          'Parent community must belong to the same customer',
        );
      }
      throw error;
    }
  }

  private async requireVisible(
    tenant: TenantContext,
    communityId: string,
  ): Promise<CommunityNode> {
    const nodes = await this.communityRepository.find({
      where: { tenant_id: tenant.tenantId },
    });
    const visible = visibleCommunityIds(
      this.toHierarchy(nodes),
      tenant.memberships,
    );
    const node = nodes.find((candidate) => candidate.id === communityId);
    if (!node || !visible.has(communityId)) {
      throw new ResourceNotFoundException('Community not found');
    }
    return node;
  }

  private async loadTenantNodesFor(
    communityId: string,
  ): Promise<CommunityNode[] | null> {
    const node = await this.communityRepository.findOne({
      where: { id: communityId },
    });
    if (!node) {
      return null;
    }
    return this.communityRepository.find({
      where: { tenant_id: node.tenant_id },
    });
  }

  private async saveWithUniqueSlug(input: {
    tenant_id: string;
    parent_id: string | null;
    name: string;
    is_active: boolean;
  }): Promise<CommunityNode> {
    const baseSlug = slugify(
      input.name,
      `community-${randomBytes(4).toString('hex')}`,
    );
    const slugs = [
      baseSlug,
      `${baseSlug.slice(0, 71)}-${randomBytes(4).toString('hex')}`,
      `community-${randomBytes(6).toString('hex')}`,
    ];

    for (const slug of slugs) {
      try {
        return await this.communityRepository.save(
          this.communityRepository.create({
            ...input,
            slug,
          }),
        );
      } catch (error) {
        if (isUniqueViolation(error)) {
          continue;
        }
        if (isRaiseException(error)) {
          throw new InvalidRequestException(
            'Parent community must belong to the same customer',
          );
        }
        throw error;
      }
    }

    throw new ResourceConflictException(
      'Unable to allocate a unique community slug',
    );
  }

  private toHierarchy(nodes: CommunityNode[]): Array<{
    id: string;
    parentId: string | null;
  }> {
    return nodes.map((node) => ({ id: node.id, parentId: node.parent_id }));
  }

  private toRecord(node: CommunityNode): CommunityRecord {
    return {
      id: node.id,
      tenantId: node.tenant_id,
      parentId: node.parent_id,
      isActive: node.is_active,
    };
  }

  private toResponse(node: CommunityNode): CommunityResponse {
    return {
      id: node.id,
      customerId: node.tenant_id,
      parentId: node.parent_id,
      name: node.name,
      slug: node.slug,
      isActive: node.is_active,
      createdAt: node.created_at.toISOString(),
      updatedAt: node.updated_at.toISOString(),
    };
  }
}
