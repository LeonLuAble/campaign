import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceConflictException } from '../../../shared/errors/domain-http.exceptions.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { ImpactFactor } from '../domain/impact-factor.entity.js';
import { ImpactFactorService } from './impact-factor.service.js';

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
      PERMISSIONS.IMPACT_FACTORS_CREATE,
      PERMISSIONS.IMPACT_FACTORS_READ,
      PERMISSIONS.IMPACT_FACTORS_UPDATE,
    ]),
  };
}

describe('ImpactFactorService', () => {
  let service: ImpactFactorService;
  const factorRepository = {
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
    campaigns.getCampaignRecord.mockResolvedValue({ id: campaignId });
    factorRepository.find.mockResolvedValue([]);
    factorRepository.save.mockImplementation(async (value: object) => ({
      id: 'factor-1',
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      updated_at: new Date('2026-01-01T00:00:00.000Z'),
      ...value,
    }));
    const module = await Test.createTestingModule({
      providers: [
        ImpactFactorService,
        {
          provide: getRepositoryToken(ImpactFactor),
          useValue: factorRepository,
        },
        { provide: CampaignService, useValue: campaigns },
        { provide: CustomerService, useValue: customers },
      ],
    }).compile();
    service = module.get(ImpactFactorService);
  });

  it('assigns the next version and stores the cited source', async () => {
    factorRepository.find.mockResolvedValue([
      {
        id: 'old',
        version: 1,
        is_active: true,
        effective_from: '2026-01-01',
        effective_to: '2026-06-01',
        source_unit: 'days',
        outcome_metric: 'co2_kg',
      },
    ]);
    const created = await service.create(
      adminContext(),
      adminUserId,
      {
        sourceUnit: 'days',
        outcomeMetric: 'co2_kg',
        outcomeUnit: 'kg',
        factorValue: 2.5,
        source: 'Admin-cited source',
        effectiveFrom: '2026-06-01',
      },
      campaignId,
    );
    expect(created.version).toBe(2);
    expect(created.source).toBe('Admin-cited source');
    expect(created.factorValue).toBe(2.5);
  });

  it('closes an open previous version when a later version is created', async () => {
    const previous = {
      id: 'old',
      version: 1,
      is_active: true,
      effective_from: '2026-01-01',
      effective_to: null,
      source_unit: 'days',
      outcome_metric: 'co2_kg',
    };
    factorRepository.find.mockResolvedValue([previous]);
    await service.create(
      adminContext(),
      adminUserId,
      {
        sourceUnit: 'days',
        outcomeMetric: 'co2_kg',
        outcomeUnit: 'kg',
        factorValue: 3,
        source: 'Updated citation',
        effectiveFrom: '2026-06-01',
      },
      campaignId,
    );
    expect(previous.effective_to).toBe('2026-06-01');
  });

  it('rejects overlapping active ranges that cannot be closed', async () => {
    factorRepository.find.mockResolvedValue([
      {
        id: 'old',
        version: 1,
        is_active: true,
        effective_from: '2026-01-01',
        effective_to: '2026-12-01',
        source_unit: 'days',
        outcome_metric: 'co2_kg',
      },
    ]);
    await expect(
      service.create(
        adminContext(),
        adminUserId,
        {
          sourceUnit: 'days',
          outcomeMetric: 'co2_kg',
          outcomeUnit: 'kg',
          factorValue: 3,
          source: 'Overlap',
          effectiveFrom: '2026-06-01',
        },
        campaignId,
      ),
    ).rejects.toBeInstanceOf(ResourceConflictException);
  });
});
