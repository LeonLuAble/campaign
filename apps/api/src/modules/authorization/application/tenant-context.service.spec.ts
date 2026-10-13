import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  InvalidRequestException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import { AuthorizationService } from './authorization.service.js';
import { TenantContextService } from './tenant-context.service.js';

describe('TenantContextService', () => {
  const tenantA = '11111111-1111-4111-8111-111111111111';
  const tenantB = '22222222-2222-4222-8222-222222222222';
  const communityId = '33333333-3333-4333-8333-333333333333';
  const membershipId = '44444444-4444-4444-8444-444444444444';
  const userId = '55555555-5555-4555-8555-555555555555';

  const tenants = { findById: vi.fn() };
  const communities = {
    findById: vi.fn(),
    listAncestorIds: vi.fn(),
    listDescendantIds: vi.fn(),
  };
  const memberships = {
    listActiveForUserInTenant: vi.fn(),
    findById: vi.fn(),
  };
  const authorization = {
    resolvePermissionKeys: vi.fn(),
    findRoleById: vi.fn(),
  };
  const campaigns = {
    findCampaignById: vi.fn(),
    findTemplateById: vi.fn(),
    findScopeById: vi.fn(),
  };
  const participations = { findById: vi.fn() };
  const actions = {
    findActionById: vi.fn(),
    findDefinitionById: vi.fn(),
    findSubmissionById: vi.fn(),
  };
  const commitments = { findById: vi.fn() };

  let service: TenantContextService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new TenantContextService(
      tenants,
      communities,
      memberships,
      authorization as unknown as AuthorizationService,
      campaigns,
      participations,
      actions,
      commitments,
    );
  });

  it('builds context from a customer id after verifying membership', async () => {
    tenants.findById.mockResolvedValue({ id: tenantA, isActive: true });
    memberships.listActiveForUserInTenant.mockResolvedValue([
      {
        id: membershipId,
        tenantId: tenantA,
        userId,
        communityId: null,
        isActive: true,
      },
    ]);
    authorization.resolvePermissionKeys.mockResolvedValue(
      new Set(['customers.read']),
    );

    const context = await service.build(userId, { customerId: tenantA });

    expect(context.tenantId).toBe(tenantA);
    expect(context.permissions.has('customers.read')).toBe(true);
    expect(memberships.listActiveForUserInTenant).toHaveBeenCalledWith(
      userId,
      tenantA,
    );
  });

  it('hides another tenant behind not found when the user has no membership', async () => {
    tenants.findById.mockResolvedValue({ id: tenantB, isActive: true });
    memberships.listActiveForUserInTenant.mockResolvedValue([]);

    await expect(
      service.build(userId, { customerId: tenantB }),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('rejects mismatched customer and community tenant ids', async () => {
    tenants.findById.mockResolvedValue({ id: tenantA, isActive: true });
    communities.findById.mockResolvedValue({
      id: communityId,
      tenantId: tenantB,
      parentId: null,
      isActive: true,
    });

    await expect(
      service.build(userId, {
        customerId: tenantA,
        communityId,
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('requires a tenant selector', async () => {
    await expect(service.build('user-1', {})).rejects.toBeInstanceOf(
      InvalidRequestException,
    );
  });

  it('rejects a non-UUID customer id before querying', async () => {
    await expect(
      service.build('user-1', { customerId: 'not-a-uuid' }),
    ).rejects.toBeInstanceOf(InvalidRequestException);
    expect(tenants.findById).not.toHaveBeenCalled();
  });

  it('resolves tenant from a campaign id', async () => {
    const campaignId = '66666666-6666-4666-8666-666666666666';
    campaigns.findCampaignById.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
    });
    memberships.listActiveForUserInTenant.mockResolvedValue([
      {
        id: membershipId,
        tenantId: tenantA,
        userId,
        communityId: null,
        isActive: true,
      },
    ]);
    authorization.resolvePermissionKeys.mockResolvedValue(
      new Set(['campaigns.read']),
    );

    const context = await service.build(userId, { campaignId });
    expect(context.tenantId).toBe(tenantA);
  });

  it('resolves tenant from an action id', async () => {
    const actionId = '77777777-7777-4777-8777-777777777777';
    actions.findActionById.mockResolvedValue({
      id: actionId,
      tenantId: tenantA,
    });
    memberships.listActiveForUserInTenant.mockResolvedValue([
      {
        id: membershipId,
        tenantId: tenantA,
        userId,
        communityId: null,
        isActive: true,
      },
    ]);
    authorization.resolvePermissionKeys.mockResolvedValue(
      new Set(['actions.read']),
    );

    const context = await service.build(userId, { actionId });
    expect(context.tenantId).toBe(tenantA);
  });
});
