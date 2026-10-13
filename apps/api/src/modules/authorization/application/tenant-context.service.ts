import { Inject, Injectable, forwardRef } from '@nestjs/common';
import {
  InvalidRequestException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import {
  COMMUNITY_READER,
  MEMBERSHIP_READER,
  TENANT_READER,
  type CommunityReader,
  type MembershipReader,
  type TenantReader,
} from './access-readers.js';
import { AuthorizationService } from './authorization.service.js';
import type { TenantContext, TenantScopeInput } from './tenant-context.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(
  value: string | null | undefined,
  field: string,
): string | null {
  if (!value) {
    return null;
  }
  if (!UUID_PATTERN.test(value)) {
    throw new InvalidRequestException(`${field} must be a UUID`);
  }
  return value;
}

@Injectable()
export class TenantContextService {
  constructor(
    @Inject(forwardRef(() => TENANT_READER))
    private readonly tenants: TenantReader,
    @Inject(forwardRef(() => COMMUNITY_READER))
    private readonly communities: CommunityReader,
    @Inject(forwardRef(() => MEMBERSHIP_READER))
    private readonly memberships: MembershipReader,
    @Inject(forwardRef(() => AuthorizationService))
    private readonly authorization: AuthorizationService,
  ) {}

  async build(userId: string, input: TenantScopeInput): Promise<TenantContext> {
    const normalized: TenantScopeInput = {
      customerId: requireUuid(input.customerId, 'customerId'),
      communityId: requireUuid(input.communityId, 'communityId'),
      membershipId: requireUuid(input.membershipId, 'membershipId'),
      roleId: requireUuid(input.roleId, 'roleId'),
      parentId: requireUuid(input.parentId, 'parentId'),
    };
    const tenantId = await this.resolveTenantId(normalized);
    const memberships = await this.memberships.listActiveForUserInTenant(
      userId,
      tenantId,
    );
    if (memberships.length === 0) {
      throw new ResourceNotFoundException('Resource not found');
    }

    const resourceCommunityId = this.resourceCommunityId(normalized);
    let ancestorIds: string[] = [];
    if (resourceCommunityId) {
      const community = await this.communities.findById(resourceCommunityId);
      if (!community || community.tenantId !== tenantId) {
        throw new ResourceNotFoundException('Resource not found');
      }
      ancestorIds = await this.communities.listAncestorIds(resourceCommunityId);
    }

    const permissions = await this.authorization.resolvePermissionKeys(
      memberships,
      resourceCommunityId,
      ancestorIds,
    );

    return {
      tenantId,
      resourceCommunityId,
      memberships,
      permissions,
    };
  }

  private async resolveTenantId(input: TenantScopeInput): Promise<string> {
    const candidates = new Set<string>();

    if (input.customerId) {
      const tenant = await this.tenants.findById(input.customerId);
      if (!tenant) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(tenant.id);
    }

    if (input.communityId) {
      const community = await this.communities.findById(input.communityId);
      if (!community) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(community.tenantId);
    }

    if (input.parentId) {
      const parent = await this.communities.findById(input.parentId);
      if (!parent) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(parent.tenantId);
    }

    if (input.membershipId) {
      const membership = await this.memberships.findById(input.membershipId);
      if (!membership) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(membership.tenantId);
    }

    if (input.roleId) {
      const role = await this.authorization.findRoleById(input.roleId);
      if (!role) {
        throw new ResourceNotFoundException('Resource not found');
      }
      candidates.add(role.tenant_id);
    }

    if (candidates.size === 0) {
      throw new InvalidRequestException('customerId is required');
    }
    if (candidates.size > 1) {
      throw new ResourceNotFoundException('Resource not found');
    }
    return [...candidates][0];
  }

  private resourceCommunityId(input: TenantScopeInput): string | null {
    return input.communityId ?? input.parentId ?? null;
  }
}
