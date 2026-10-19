import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AccessForbiddenException,
  InvalidRequestException,
  ResourceConflictException,
} from '../../../shared/errors/domain-http.exceptions.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { CampaignStatus } from '../../campaigns/domain/campaign.entity.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { LocalizationService } from '../../localization/application/localization.service.js';
import { CAMPAIGN_NOTIFICATIONS } from '../../notifications/application/campaign-notifications.js';
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

function milestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: milestoneId,
    tenant_id: tenantA,
    campaign_id: campaignId,
    key: 'halfway',
    name: 'Halfway',
    description: null,
    due_on: null,
    metric: MilestoneMetric.COMPLETION_PERCENT,
    threshold_value: 50,
    unit: 'days',
    is_active: true,
    created_by_user_id: adminUserId,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
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
  const localization = {
    resolveMilestoneContent: vi.fn(),
    readMilestoneEnglish: vi.fn(),
    upsertMilestoneContentTranslations: vi.fn(),
  };
  const notifications = { notifyMilestoneAchieved: vi.fn() };

  function campaignWithStatus(status: CampaignStatus) {
    return {
      id: campaignId,
      tenantId: tenantA,
      name: '速素数数',
      status,
      timezone: 'Asia/Kuala_Lumpur',
      startsOn: '2026-01-01',
      endsOn: '2026-01-31',
      configuration: {},
      communityIds: [],
    };
  }

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
    localization.resolveMilestoneContent.mockImplementation(
      async (
        _locale: string,
        _tenantId: string,
        _id: string,
        _field: string,
        primary: string | null,
      ) => primary,
    );
    localization.readMilestoneEnglish.mockResolvedValue(null);
    localization.upsertMilestoneContentTranslations.mockResolvedValue(undefined);
    notifications.notifyMilestoneAchieved.mockResolvedValue(undefined);
    milestoneRepository.findOne.mockImplementation(
      async (options: { where: { id?: string; due_on?: string } }) =>
        options.where.due_on === undefined ? milestone() : null,
    );
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
        { provide: LocalizationService, useValue: localization },
        { provide: CAMPAIGN_NOTIFICATIONS, useValue: notifications },
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

  describe('dated milestones', () => {
    async function expectCode(promise: Promise<unknown>, code: string) {
      await expect(promise).rejects.toSatisfy((error: unknown) => {
        const body = (error as { getResponse: () => { code: string } })
          .getResponse();
        return body.code === code;
      });
    }

    beforeEach(() => {
      campaigns.getCampaignRecord.mockResolvedValue(
        campaignWithStatus(CampaignStatus.DRAFT),
      );
    });

    it('creates a dated milestone without a goal in a draft campaign', async () => {
      const created = await service.create(adminContext(), campaignId, adminUserId, {
        name: '第一阶段',
        dueOn: '2026-01-15',
        translations: { en: { name: 'Stage one' } },
      });
      expect(created).toMatchObject({
        dueOn: '2026-01-15',
        metric: null,
        thresholdValue: null,
        unit: null,
        hasGoal: false,
      });
      expect(milestoneRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          due_on: '2026-01-15',
          metric: null,
          threshold_value: null,
          unit: null,
        }),
      );
      expect(localization.upsertMilestoneContentTranslations).toHaveBeenCalledWith(
        tenantA,
        milestoneId,
        { en: { name: 'Stage one' } },
      );
    });

    it('accepts dueOn on the first and last campaign day', async () => {
      for (const dueOn of ['2026-01-01', '2026-01-31']) {
        await expect(
          service.create(adminContext(), campaignId, adminUserId, {
            name: 'Edge',
            dueOn,
          }),
        ).resolves.toMatchObject({ dueOn });
      }
    });

    it.each(['2025-12-31', '2026-02-01'])(
      'rejects dueOn %s outside the campaign window',
      async (dueOn) => {
        await expectCode(
          service.create(adminContext(), campaignId, adminUserId, {
            name: 'Outside',
            dueOn,
          }),
          'MILESTONE_DATE_OUT_OF_WINDOW',
        );
      },
    );

    it('rejects a dated milestone when the campaign has no window', async () => {
      campaigns.getCampaignRecord.mockResolvedValue({
        ...campaignWithStatus(CampaignStatus.DRAFT),
        endsOn: null,
      });
      await expectCode(
        service.create(adminContext(), campaignId, adminUserId, {
          name: 'No window',
          dueOn: '2026-01-10',
        }),
        'MILESTONE_DATE_OUT_OF_WINDOW',
      );
    });

    it('rejects an invalid calendar date', async () => {
      await expect(
        service.create(adminContext(), campaignId, adminUserId, {
          name: 'Bad date',
          dueOn: '2026-02-30',
        }),
      ).rejects.toBeInstanceOf(InvalidRequestException);
    });

    it('rejects a second active milestone on the same date', async () => {
      milestoneRepository.findOne.mockResolvedValue(
        milestone({ id: 'other', due_on: '2026-01-15' }),
      );
      await expectCode(
        service.create(adminContext(), campaignId, adminUserId, {
          name: 'Clash',
          dueOn: '2026-01-15',
        }),
        'MILESTONE_DATE_DUPLICATE',
      );
    });

    it('rejects a partial goal', async () => {
      await expect(
        service.create(adminContext(), campaignId, adminUserId, {
          name: 'Partial',
          dueOn: '2026-01-15',
          metric: MilestoneMetric.ACHIEVED_VALUE,
        }),
      ).rejects.toBeInstanceOf(InvalidRequestException);
    });

    it('rejects a milestone with neither a date nor a goal', async () => {
      await expect(
        service.create(adminContext(), campaignId, adminUserId, {
          name: 'Empty',
        }),
      ).rejects.toBeInstanceOf(InvalidRequestException);
    });

    it('allows changing the date and removing a dated milestone in draft', async () => {
      milestoneRepository.findOne.mockImplementation(
        async (options: { where: { due_on?: string } }) =>
          options.where.due_on === undefined
            ? milestone({ due_on: '2026-01-15', metric: null, threshold_value: null, unit: null })
            : null,
      );
      await expect(
        service.update(adminContext(), milestoneId, { dueOn: '2026-01-20' }),
      ).resolves.toMatchObject({ dueOn: '2026-01-20' });
      await expect(
        service.update(adminContext(), milestoneId, { isActive: false }),
      ).resolves.toMatchObject({ isActive: false });
    });

    it('clears the goal when all goal fields are set to null', async () => {
      milestoneRepository.findOne.mockImplementation(
        async (options: { where: { due_on?: string } }) =>
          options.where.due_on === undefined
            ? milestone({ due_on: '2026-01-15' })
            : null,
      );
      const updated = await service.update(adminContext(), milestoneId, {
        metric: null,
        thresholdValue: null,
        unit: null,
      });
      expect(updated.hasGoal).toBe(false);
    });

    describe.each([
      CampaignStatus.PUBLISHED,
      CampaignStatus.STARTED,
      CampaignStatus.COMPLETED,
    ])('after publish (%s)', (status) => {
      beforeEach(() => {
        campaigns.getCampaignRecord.mockResolvedValue(campaignWithStatus(status));
        milestoneRepository.findOne.mockImplementation(
          async (options: { where: { due_on?: string } }) =>
            options.where.due_on === undefined
              ? milestone({ due_on: '2026-01-15' })
              : null,
        );
      });

      it('locks dueOn changes', async () => {
        await expectCode(
          service.update(adminContext(), milestoneId, { dueOn: '2026-01-20' }),
          'MILESTONE_LOCKED',
        );
        await expectCode(
          service.update(adminContext(), milestoneId, { dueOn: null }),
          'MILESTONE_LOCKED',
        );
      });

      it('locks removal or deactivation of a dated milestone', async () => {
        await expectCode(
          service.update(adminContext(), milestoneId, { isActive: false }),
          'MILESTONE_LOCKED',
        );
      });

      it('locks adding a new dated milestone', async () => {
        await expectCode(
          service.create(adminContext(), campaignId, adminUserId, {
            name: 'Late',
            dueOn: '2026-01-20',
          }),
          'MILESTONE_LOCKED',
        );
      });

      it('keeps name, description, translations and goal editable', async () => {
        const updated = await service.update(adminContext(), milestoneId, {
          name: 'Renamed',
          description: 'New description',
          dueOn: '2026-01-15',
          isActive: true,
          metric: MilestoneMetric.ACHIEVED_VALUE,
          thresholdValue: 99,
          unit: 'meals',
          translations: { en: { name: 'Renamed EN' } },
        });
        expect(updated).toMatchObject({
          name: 'Renamed',
          description: 'New description',
          dueOn: '2026-01-15',
          metric: 'achieved_value',
          thresholdValue: 99,
          unit: 'meals',
        });
      });
    });

    it('still lets an undated goal milestone be added and deactivated after publish', async () => {
      campaigns.getCampaignRecord.mockResolvedValue(
        campaignWithStatus(CampaignStatus.STARTED),
      );
      await expect(
        service.create(adminContext(), campaignId, adminUserId, {
          name: 'Halfway',
          metric: MilestoneMetric.COMPLETION_PERCENT,
          thresholdValue: 50,
          unit: 'days',
        }),
      ).resolves.toMatchObject({ dueOn: null, hasGoal: true });
      await expect(
        service.update(adminContext(), milestoneId, { isActive: false }),
      ).resolves.toMatchObject({ isActive: false });
    });

    it('maps the due-date unique index race to MILESTONE_DATE_DUPLICATE', async () => {
      const { QueryFailedError } = await import('typeorm');
      milestoneRepository.save.mockRejectedValue(
        new QueryFailedError('INSERT', [], {
          code: '23505',
          constraint: 'uq_milestones_campaign_due_on',
        } as unknown as Error),
      );
      await expectCode(
        service.create(adminContext(), campaignId, adminUserId, {
          name: 'Race',
          dueOn: '2026-01-15',
        }),
        'MILESTONE_DATE_DUPLICATE',
      );
    });
  });

  describe('goal-less milestones', () => {
    beforeEach(() => {
      milestoneRepository.findOne.mockResolvedValue(
        milestone({
          due_on: '2026-01-15',
          metric: null,
          threshold_value: null,
          unit: null,
        }),
      );
    });

    it('skips evaluation, history and the first-crossing notification', async () => {
      await expect(
        service.evaluate(adminContext(), milestoneId, adminUserId),
      ).rejects.toBeInstanceOf(InvalidRequestException);
      expect(evaluationRepository.save).not.toHaveBeenCalled();
      expect(progressRepository.save).not.toHaveBeenCalled();
      expect(notifications.notifyMilestoneAchieved).not.toHaveBeenCalled();
      expect(progress.getCampaignProgress).not.toHaveBeenCalled();
    });

    it('reports progress as goal-less and never crossed', async () => {
      const current = await service.getProgress(adminContext(), milestoneId);
      expect(current).toMatchObject({
        hasGoal: false,
        metric: null,
        crossed: false,
        status: 'none',
      });
    });
  });

  it('notifies once on the first crossing of a goal milestone', async () => {
    await service.evaluate(adminContext(), milestoneId, adminUserId);
    expect(notifications.notifyMilestoneAchieved).toHaveBeenCalledTimes(1);
  });

  describe('listPeriods', () => {
    it('splits the campaign window at active dated milestones', async () => {
      milestoneRepository.find.mockResolvedValue([
        milestone({ id: 'm2', name: 'Two', due_on: '2026-01-20' }),
        milestone({ id: 'm1', name: 'One', due_on: '2026-01-10' }),
      ]);
      const periods = await service.listPeriods(adminContext(), campaignId);
      expect(periods.map((p) => [p.key, p.startsOn, p.milestoneId, p.name])).toEqual([
        ['2026-01-10', '2026-01-01', 'm1', 'One'],
        ['2026-01-20', '2026-01-11', 'm2', 'Two'],
        ['2026-01-31', '2026-01-21', null, null],
      ]);
      expect(milestoneRepository.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenant_id: tenantA,
          campaign_id: campaignId,
          is_active: true,
        }),
      });
    });

    it('propagates campaign visibility errors', async () => {
      campaigns.getCampaignRecord.mockRejectedValue(
        new ResourceConflictException('nope'),
      );
      await expect(
        service.listPeriods(adminContext(), campaignId),
      ).rejects.toBeInstanceOf(ResourceConflictException);
    });
  });
});
