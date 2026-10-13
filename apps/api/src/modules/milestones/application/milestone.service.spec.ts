import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessForbiddenException } from '../../../shared/errors/domain-http.exceptions.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { CampaignStatus } from '../../campaigns/domain/campaign.entity.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { ProgressService } from '../../progress/application/progress.service.js';
import { MilestoneEvaluation } from '../domain/milestone-evaluation.entity.js';
import { MilestoneProgress } from '../domain/milestone-progress.entity.js';
import { Milestone, MilestoneMetric } from '../domain/milestone.entity.js';
import { MilestoneService } from './milestone.service.js';

const tenantA = '11111111-1111-4111-8111-111111111111';
const campaignId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const adminUserId = 'admin-user';
const milestoneId = '99999999-9999-4999-8999-999999999999';

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
      PERMISSIONS.MILESTONES_CREATE,
      PERMISSIONS.MILESTONES_READ,
      PERMISSIONS.MILESTONES_UPDATE,
      PERMISSIONS.MILESTONES_EVALUATE,
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

function milestone(): Milestone {
  return {
    id: milestoneId,
    tenant_id: tenantA,
    campaign_id: campaignId,
    key: 'halfway',
    name: 'Halfway',
    description: null,
    metric: MilestoneMetric.COMPLETION_PERCENT,
    threshold_value: 50,
    unit: 'days',
    is_active: true,
    created_by_user_id: adminUserId,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
  };
}

describe('MilestoneService', () => {
  let service: MilestoneService;
  const milestoneRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
  };
  const progressRepository = {
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
  };
  const evaluationRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
  };
  const campaigns = { getCampaignRecord: vi.fn() };
  const progress = { getCampaignProgress: vi.fn() };
  const customers = { requireActive: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    customers.requireActive.mockResolvedValue(undefined);
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      name: '速素数数',
      status: CampaignStatus.STARTED,
      timezone: 'Asia/Kuala_Lumpur',
      startsOn: '2026-01-01',
      endsOn: '2026-01-31',
      configuration: {},
      communityIds: [],
    });
    evaluationRepository.findOne.mockResolvedValue(null);
    milestoneRepository.findOne.mockResolvedValue(milestone());
    milestoneRepository.save.mockImplementation(async (value: Milestone) => ({
      ...milestone(),
      ...value,
      id: value.id ?? milestoneId,
      created_at: milestone().created_at,
      updated_at: milestone().updated_at,
    }));
    progress.getCampaignProgress.mockResolvedValue({
      scope: 'campaign',
      units: [
        {
          unit: 'days',
          achievedValue: 6,
          targetValue: 10,
          completionPercent: 60,
          completionStatus: 'in_progress',
          approvedActionCount: 6,
          distinctApprovedDays: 6,
          committedParticipantCount: 1,
        },
      ],
    });
    progressRepository.findOne.mockResolvedValue(null);
    evaluationRepository.save.mockImplementation(
      async (value: MilestoneEvaluation) => ({
        ...value,
        id: 'evaluation-1',
        created_at: new Date('2026-01-15T00:00:00.000Z'),
      }),
    );

    const module = await Test.createTestingModule({
      providers: [
        MilestoneService,
        {
          provide: getRepositoryToken(Milestone),
          useValue: milestoneRepository,
        },
        {
          provide: getRepositoryToken(MilestoneProgress),
          useValue: progressRepository,
        },
        {
          provide: getRepositoryToken(MilestoneEvaluation),
          useValue: evaluationRepository,
        },
        { provide: CampaignService, useValue: campaigns },
        { provide: ProgressService, useValue: progress },
        { provide: CustomerService, useValue: customers },
      ],
    }).compile();
    service = module.get(MilestoneService);
  });

  it('computes live campaign progress toward a milestone without ranking people', async () => {
    const current = await service.getProgress(adminContext(), milestoneId);
    expect(current).toMatchObject({
      milestoneId,
      crossed: true,
      currentAchievedValue: 6,
      currentCompletionPercent: 60,
      thresholdValue: 50,
    });
    expect(JSON.stringify(current)).not.toContain('userId');
  });

  it('appends an evaluation snapshot and never deletes earlier ones', async () => {
    const now = new Date('2026-01-15T00:00:00.000Z');
    const evaluation = await service.evaluate(
      adminContext(),
      milestoneId,
      adminUserId,
      now,
    );
    expect(evaluation.crossed).toBe(true);
    expect(evaluationRepository.save).toHaveBeenCalledTimes(1);
    expect(progressRepository.save).toHaveBeenCalledTimes(1);
  });

  it('rejects community-scoped admins from creating milestones', async () => {
    await expect(
      service.create(communityAdminContext(), campaignId, adminUserId, {
        name: 'Halfway',
        metric: MilestoneMetric.COMPLETION_PERCENT,
        thresholdValue: 50,
        unit: 'days',
      }),
    ).rejects.toBeInstanceOf(AccessForbiddenException);
  });
});
