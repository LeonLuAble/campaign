import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessForbiddenException } from '../../../shared/errors/domain-http.exceptions.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { CampaignStatus } from '../../campaigns/domain/campaign.entity.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { MeasurementDefinition } from '../domain/measurement-definition.entity.js';
import { MeasurementDefinitionService } from './measurement-definition.service.js';

const tenantA = '11111111-1111-4111-8111-111111111111';
const campaignId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const adminUserId = 'admin-user';

function adminContext(): TenantContext {
  return {
    tenantId: tenantA,
    resourceCommunityId: null,
    memberships: [
      {
        id: 'admin-membership',
        tenantId: tenantA,
        userId: adminUserId,
        communityId: null,
        isActive: true,
      },
    ],
    permissions: new Set([
      PERMISSIONS.MEASUREMENT_DEFINITIONS_CREATE,
      PERMISSIONS.MEASUREMENT_DEFINITIONS_READ,
      PERMISSIONS.MEASUREMENT_DEFINITIONS_UPDATE,
    ]),
  };
}

function communityAdminContext(): TenantContext {
  return {
    ...adminContext(),
    memberships: [
      {
        id: 'community-admin',
        tenantId: tenantA,
        userId: adminUserId,
        communityId: 'community-1',
        isActive: true,
      },
    ],
  };
}

describe('MeasurementDefinitionService', () => {
  let service: MeasurementDefinitionService;
  const definitionRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
  };
  const campaigns = { getCampaignRecord: vi.fn() };
  const customers = { requireActive: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    customers.requireActive.mockResolvedValue(undefined);
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.STARTED,
    });
    definitionRepository.save.mockImplementation(async (value: object) => ({
      id: 'def-1',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
      ...value,
    }));
    const module = await Test.createTestingModule({
      providers: [
        MeasurementDefinitionService,
        {
          provide: getRepositoryToken(MeasurementDefinition),
          useValue: definitionRepository,
        },
        { provide: CampaignService, useValue: campaigns },
        { provide: CustomerService, useValue: customers },
      ],
    }).compile();
    service = module.get(MeasurementDefinitionService);
  });

  it('lets a tenant-level admin create a campaign measurement definition', async () => {
    const created = await service.create(
      adminContext(),
      campaignId,
      adminUserId,
      {
        name: 'Vegetarian days',
        sourceUnit: 'days',
      },
    );
    expect(created.sourceUnit).toBe('days');
    expect(definitionRepository.save).toHaveBeenCalled();
  });

  it('rejects community-only admins from managing definitions', async () => {
    await expect(
      service.create(communityAdminContext(), campaignId, adminUserId, {
        name: 'Vegetarian days',
        sourceUnit: 'days',
      }),
    ).rejects.toBeInstanceOf(AccessForbiddenException);
  });
});
