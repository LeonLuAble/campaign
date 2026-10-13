import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AccessForbiddenException,
  InvalidRequestException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { CommunityService } from '../../communities/application/community.service.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { CampaignCommunity } from '../domain/campaign-community.entity.js';
import { CampaignConfiguration } from '../domain/campaign-configuration.entity.js';
import { CampaignScope } from '../domain/campaign-scope.entity.js';
import { CampaignTemplate } from '../domain/campaign-template.entity.js';
import { Campaign, CampaignStatus } from '../domain/campaign.entity.js';
import { CampaignService } from './campaign.service.js';

const tenantA = '11111111-1111-4111-8111-111111111111';
const tenantB = '22222222-2222-4222-8222-222222222222';
const templateId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const scopeId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const campaignId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const communityId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function adminTenant(tenantId = tenantA): TenantContext {
  return {
    tenantId,
    resourceCommunityId: null,
    memberships: [
      {
        id: 'admin-membership',
        tenantId,
        userId: 'admin-user',
        communityId: null,
        isActive: true,
      },
    ],
    permissions: new Set(['campaigns.create', 'campaigns.update']),
  };
}

function communityTenant(): TenantContext {
  return {
    tenantId: tenantA,
    resourceCommunityId: communityId,
    memberships: [
      {
        id: 'branch-membership',
        tenantId: tenantA,
        userId: 'member-user',
        communityId,
        isActive: true,
      },
    ],
    permissions: new Set(['campaigns.read']),
  };
}

function template(overrides: Partial<CampaignTemplate> = {}): CampaignTemplate {
  return {
    id: templateId,
    tenant_id: tenantA,
    key: 'environmental_action',
    name: 'Environmental Action',
    description: null,
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function scope(overrides: Partial<CampaignScope> = {}): CampaignScope {
  return {
    id: scopeId,
    tenant_id: tenantA,
    template_id: templateId,
    key: 'vegetarian',
    name: 'Vegetarian',
    description: null,
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: campaignId,
    tenant_id: tenantA,
    template_id: templateId,
    scope_id: scopeId,
    name: '速素数数',
    slug: 'campaign-abc',
    description: null,
    status: CampaignStatus.DRAFT,
    timezone: 'Asia/Kuala_Lumpur',
    starts_on: '2026-01-01',
    ends_on: '2026-12-31',
    created_by_user_id: 'admin-user',
    published_at: null,
    started_at: null,
    completed_at: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('CampaignService', () => {
  let service: CampaignService;
  const templateRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
  };
  const scopeRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
  };
  const campaignRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
  };
  const configurationRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
  };
  const campaignCommunityRepository = {
    find: vi.fn(),
    delete: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
  };
  const customers = { requireActive: vi.fn() };
  const communities = { get: vi.fn(), listAncestorIds: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    customers.requireActive.mockResolvedValue(undefined);
    communities.listAncestorIds.mockResolvedValue([]);
    configurationRepository.find.mockResolvedValue([]);
    campaignCommunityRepository.find.mockResolvedValue([]);
    campaignRepository.save.mockImplementation(async (value: Campaign) => ({
      ...value,
      id: value.id ?? campaignId,
      created_at: value.created_at ?? new Date('2026-01-01T00:00:00.000Z'),
      updated_at: value.updated_at ?? new Date('2026-01-01T00:00:00.000Z'),
    }));
    const module = await Test.createTestingModule({
      providers: [
        CampaignService,
        {
          provide: getRepositoryToken(CampaignTemplate),
          useValue: templateRepository,
        },
        {
          provide: getRepositoryToken(CampaignScope),
          useValue: scopeRepository,
        },
        { provide: getRepositoryToken(Campaign), useValue: campaignRepository },
        {
          provide: getRepositoryToken(CampaignConfiguration),
          useValue: configurationRepository,
        },
        {
          provide: getRepositoryToken(CampaignCommunity),
          useValue: campaignCommunityRepository,
        },
        { provide: CustomerService, useValue: customers },
        { provide: CommunityService, useValue: communities },
      ],
    }).compile();
    service = module.get(CampaignService);
  });

  it('creates a draft campaign with generic configuration and target communities', async () => {
    templateRepository.findOne.mockResolvedValue(template());
    scopeRepository.findOne.mockResolvedValue(scope());
    communities.get.mockResolvedValue({ id: communityId });
    campaignCommunityRepository.find.mockResolvedValue([
      { campaign_id: campaignId, community_id: communityId },
    ]);
    configurationRepository.find.mockResolvedValue([
      { campaign_id: campaignId, settings: { reminderDay: 1 } },
    ]);

    const created = await service.createCampaign(adminTenant(), 'admin-user', {
      templateId,
      scopeId,
      name: '速素数数',
      timezone: 'Asia/Kuala_Lumpur',
      startsOn: '2026-01-01',
      endsOn: '2026-12-31',
      communityIds: [communityId],
      configuration: { reminderDay: 1 },
    });

    expect(created.status).toBe(CampaignStatus.DRAFT);
    expect(created.timezone).toBe('Asia/Kuala_Lumpur');
    expect(created.communityIds).toEqual([communityId]);
    expect(created.configuration).toEqual({ reminderDay: 1 });
    expect(configurationRepository.save).toHaveBeenCalled();
  });

  it('rejects a community-scoped member from creating a campaign', async () => {
    await expect(
      service.createCampaign(communityTenant(), 'member-user', {
        templateId,
        scopeId,
        name: 'Nope',
        timezone: 'Asia/Kuala_Lumpur',
      }),
    ).rejects.toBeInstanceOf(AccessForbiddenException);
  });

  it('rejects skipping from draft to started', async () => {
    campaignRepository.findOne.mockResolvedValue(campaign());
    await expect(
      service.startCampaign(adminTenant(), campaignId),
    ).rejects.toBeInstanceOf(InvalidRequestException);
  });

  it('publishes then starts then completes in order', async () => {
    const draft = campaign();
    campaignRepository.findOne.mockResolvedValue(draft);
    templateRepository.findOne.mockResolvedValue(template());
    scopeRepository.findOne.mockResolvedValue(scope());

    const published = await service.publishCampaign(adminTenant(), campaignId);
    expect(published.status).toBe(CampaignStatus.PUBLISHED);

    draft.status = CampaignStatus.PUBLISHED;
    const started = await service.startCampaign(adminTenant(), campaignId);
    expect(started.status).toBe(CampaignStatus.STARTED);

    draft.status = CampaignStatus.STARTED;
    const completed = await service.completeCampaign(adminTenant(), campaignId);
    expect(completed.status).toBe(CampaignStatus.COMPLETED);
  });

  it('rejects definition edits after publish', async () => {
    campaignRepository.findOne.mockResolvedValue(
      campaign({ status: CampaignStatus.PUBLISHED }),
    );
    await expect(
      service.updateCampaign(adminTenant(), campaignId, { name: 'Changed' }),
    ).rejects.toBeInstanceOf(InvalidRequestException);
  });

  it('hides another tenant campaign behind not found', async () => {
    campaignRepository.findOne.mockResolvedValue(null);
    await expect(
      service.getCampaign(adminTenant(tenantB), campaignId),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('hides a branch-targeted campaign from a parent-only membership', async () => {
    campaignRepository.findOne.mockResolvedValue(campaign());
    campaignCommunityRepository.find.mockResolvedValue([
      { campaign_id: campaignId, community_id: communityId },
    ]);
    communities.listAncestorIds.mockResolvedValue([]);
    await expect(
      service.getCampaign(
        {
          tenantId: tenantA,
          resourceCommunityId: 'hq',
          memberships: [
            {
              id: 'hq-membership',
              tenantId: tenantA,
              userId: 'hq-user',
              communityId: 'hq',
              isActive: true,
            },
          ],
          permissions: new Set(['campaigns.read']),
        },
        campaignId,
      ),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('does not publish when the template is inactive', async () => {
    campaignRepository.findOne.mockResolvedValue(campaign());
    templateRepository.findOne.mockResolvedValue(
      template({ is_active: false }),
    );
    scopeRepository.findOne.mockResolvedValue(scope());
    await expect(
      service.publishCampaign(adminTenant(), campaignId),
    ).rejects.toBeInstanceOf(InvalidRequestException);
  });

  it('rejects a scope that does not belong to the template', async () => {
    templateRepository.findOne.mockResolvedValue(template());
    scopeRepository.findOne.mockResolvedValue(
      scope({ template_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' }),
    );
    await expect(
      service.createCampaign(adminTenant(), 'admin-user', {
        templateId,
        scopeId,
        name: 'Mismatch',
        timezone: 'UTC',
      }),
    ).rejects.toBeInstanceOf(InvalidRequestException);
  });
});
