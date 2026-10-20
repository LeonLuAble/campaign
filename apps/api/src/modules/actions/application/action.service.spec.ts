import { Test } from '@nestjs/testing';
import { QueryFailedError } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AccessForbiddenException,
  InvalidRequestException,
  ResourceConflictException,
  ResourceNotFoundException,
} from '../../../shared/errors/domain-http.exceptions.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CAMPAIGN_RULE_STRATEGIES } from '../../campaigns/application/campaign-rule-strategy.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { CampaignStatus } from '../../campaigns/domain/campaign.entity.js';
import { Commitment } from '../../commitments/domain/commitment.entity.js';
import { CustomerService } from '../../customers/application/customer.service.js';
import { MilestoneService } from '../../milestones/application/milestone.service.js';
import { ParticipationStatus } from '../../participation/domain/participation.entity.js';
import { ParticipationService } from '../../participation/application/participation.service.js';
import { VegetarianRuleStrategy } from '../../vegetarian/application/vegetarian-rules.js';
import { ActionBatch } from '../domain/action-batch.entity.js';
import { ActionDefinition } from '../domain/action-definition.entity.js';
import { Action, ActionStatus, PrivacyLevel } from '../domain/action.entity.js';
import { Submission, SubmissionStatus } from '../domain/submission.entity.js';
import { ActionService } from './action.service.js';

const tenantA = '11111111-1111-4111-8111-111111111111';
const campaignId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const userId = '55555555-5555-4555-8555-555555555555';
const participationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const definitionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function memberContext(): TenantContext {
  return {
    tenantId: tenantA,
    resourceCommunityId: null,
    memberships: [
      {
        id: 'member-membership',
        tenantId: tenantA,
        userId,
        communityId: null,
        isActive: true,
      },
    ],
    permissions: new Set([
      PERMISSIONS.ACTIONS_CREATE,
      PERMISSIONS.ACTIONS_READ,
      PERMISSIONS.SUBMISSIONS_READ,
    ]),
  };
}

function adminContext(): TenantContext {
  return {
    tenantId: tenantA,
    resourceCommunityId: null,
    memberships: [
      {
        id: 'admin-membership',
        tenantId: tenantA,
        userId: 'admin-user',
        communityId: null,
        isActive: true,
      },
    ],
    permissions: new Set([
      PERMISSIONS.ACTIONS_CREATE,
      PERMISSIONS.ACTIONS_READ,
      PERMISSIONS.ACTIONS_UPDATE,
      PERMISSIONS.SUBMISSIONS_READ,
      PERMISSIONS.SUBMISSIONS_UPDATE,
      PERMISSIONS.ACTION_DEFINITIONS_CREATE,
      PERMISSIONS.ACTION_DEFINITIONS_UPDATE,
    ]),
  };
}

function definition(
  overrides: Partial<ActionDefinition> = {},
): ActionDefinition {
  return {
    id: definitionId,
    tenant_id: tenantA,
    campaign_id: campaignId,
    key: 'vegetarian_day',
    name: 'Vegetarian day',
    unit: 'days',
    description: null,
    is_active: true,
    settings: {},
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function action(overrides: Partial<Action> = {}): Action {
  return {
    id: 'action-1',
    tenant_id: tenantA,
    campaign_id: campaignId,
    participation_id: participationId,
    user_id: userId,
    action_definition_id: definitionId,
    occurred_on: '2026-10-13',
    quantity: 1,
    privacy_level: PrivacyLevel.PRIVATE,
    status: ActionStatus.RECORDED,
    payload: {},
    idempotency_key: null,
    recorded_by_user_id: userId,
    cancelled_at: null,
    cancelled_by_user_id: null,
    corrected_at: null,
    corrected_by_user_id: null,
    created_at: new Date('2026-10-13T00:00:00.000Z'),
    updated_at: new Date('2026-10-13T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ActionService', () => {
  let service: ActionService;
  const definitionRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
  };
  const manager = {
    create: vi.fn((_entity: unknown, value: unknown) => value),
    save: vi.fn(async (_entity: unknown, value: Action | Submission) => ({
      ...value,
      id: 'id' in value && value.id ? value.id : 'generated-id',
      created_at: new Date('2026-10-13T00:00:00.000Z'),
      updated_at: new Date('2026-10-13T00:00:00.000Z'),
    })),
  };
  const actionRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: unknown) => value),
    manager: {
      transaction: vi.fn(async (fn: (m: typeof manager) => unknown) =>
        fn(manager),
      ),
    },
  };
  const submissionRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
  };
  const participations = { getParticipationRecord: vi.fn() };
  const campaigns = { getCampaignRecord: vi.fn() };
  const customers = { requireActive: vi.fn() };
  const commitmentRepository = { find: vi.fn() };
  const batchRepository = { findOne: vi.fn() };
  const milestones = { periodsForCampaign: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    customers.requireActive.mockResolvedValue(undefined);
    participations.getParticipationRecord.mockResolvedValue({
      id: participationId,
      tenantId: tenantA,
      campaignId,
      userId,
      communityId: null,
      status: ParticipationStatus.ENROLLED,
    });
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.STARTED,
      timezone: 'Asia/Kuala_Lumpur',
      startsOn: '2026-01-01',
      endsOn: '2026-12-31',
      configuration: { rulesStrategy: 'vegetarian' },
      communityIds: [],
    });
    definitionRepository.findOne.mockResolvedValue(definition());
    commitmentRepository.find.mockResolvedValue([]);
    milestones.periodsForCampaign.mockResolvedValue([
      {
        key: '2026-12-31',
        startsOn: '2026-01-01',
        endsOn: '2026-12-31',
        milestoneId: null,
      },
    ]);
    submissionRepository.find.mockResolvedValue([]);
    actionRepository.save.mockImplementation(async (value: Action) => ({
      ...action(),
      ...value,
    }));
    const module = await Test.createTestingModule({
      providers: [
        ActionService,
        {
          provide: getRepositoryToken(ActionDefinition),
          useValue: definitionRepository,
        },
        { provide: getRepositoryToken(Action), useValue: actionRepository },
        {
          provide: getRepositoryToken(Submission),
          useValue: submissionRepository,
        },
        { provide: CampaignService, useValue: campaigns },
        { provide: ParticipationService, useValue: participations },
        { provide: CustomerService, useValue: customers },
        {
          provide: getRepositoryToken(Commitment),
          useValue: commitmentRepository,
        },
        {
          provide: getRepositoryToken(ActionBatch),
          useValue: batchRepository,
        },
        { provide: MilestoneService, useValue: milestones },
        {
          provide: CAMPAIGN_RULE_STRATEGIES,
          useValue: [new VegetarianRuleStrategy()],
        },
      ],
    }).compile();
    service = module.get(ActionService);
  });

  it('records a vegetarian day for the participant in the campaign timezone', async () => {
    actionRepository.findOne.mockResolvedValue(null);
    manager.save.mockImplementation(async (_entity, value) => ({
      ...action(),
      ...(value as Action),
      id: (value as Action).id ?? 'action-1',
    }));
    const created = await service.record(
      memberContext(),
      userId,
      {
        participationId,
        actionDefinitionId: definitionId,
        occurredOn: '2026-10-12',
      },
      new Date('2026-10-13T02:00:00.000Z'),
    );
    expect(created.occurredOn).toBe('2026-10-12');
    expect(created.privacyLevel).toBe(PrivacyLevel.PRIVATE);
    expect(created.status).toBe(ActionStatus.RECORDED);
  });

  describe('day coverage', () => {
    const recordOn = (occurredOn: string) =>
      service.record(
        memberContext(),
        userId,
        { participationId, actionDefinitionId: definitionId, occurredOn },
        new Date('2026-10-13T02:00:00.000Z'),
      );

    beforeEach(() => {
      actionRepository.findOne.mockResolvedValue(null);
      manager.save.mockImplementation(async (_entity, value) => ({
        ...action(),
        ...(value as Action),
      }));
    });

    it('needs a committed window in campaigns with dated milestones', async () => {
      milestones.periodsForCampaign.mockResolvedValue([
        { key: '2026-10-10', startsOn: '2026-01-01', endsOn: '2026-10-10', milestoneId: 'm-1' },
        { key: '2026-12-31', startsOn: '2026-10-11', endsOn: '2026-12-31', milestoneId: null },
      ]);
      commitmentRepository.find.mockResolvedValue([
        { decision: 'committed', valid_from: '2026-10-12', valid_to: '2026-12-31' },
      ]);
      await expect(recordOn('2026-10-11')).rejects.toMatchObject({
        response: { code: 'NO_COMMITMENT_FOR_DATE' },
      });
      await expect(recordOn('2026-10-12')).resolves.toMatchObject({
        occurredOn: '2026-10-12',
      });
    });

    it('blocks a whole-campaign not_taking_part decision', async () => {
      commitmentRepository.find.mockResolvedValue([
        { decision: 'not_taking_part', valid_from: null, valid_to: null },
      ]);
      await expect(recordOn('2026-10-12')).rejects.toMatchObject({
        response: { code: 'NO_COMMITMENT_FOR_DATE' },
      });
    });

    it('reports a duplicate day as SUBMISSION_OVERLAP with the date', async () => {
      manager.save.mockRejectedValue(
        new QueryFailedError('INSERT', [], Object.assign(new Error('dup'), { code: '23505' })),
      );
      await expect(recordOn('2026-10-12')).rejects.toMatchObject({
        response: {
          code: 'SUBMISSION_OVERLAP',
          details: { conflictingDates: ['2026-10-12'] },
        },
      });
    });
  });

  it('rejects a future campaign-local day', async () => {
    await expect(
      service.record(
        memberContext(),
        userId,
        {
          participationId,
          actionDefinitionId: definitionId,
          occurredOn: '2026-10-14',
        },
        new Date('2026-10-13T02:00:00.000Z'),
      ),
    ).rejects.toBeInstanceOf(InvalidRequestException);
  });

  it('rejects recording before the campaign is started', async () => {
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.PUBLISHED,
      timezone: 'Asia/Kuala_Lumpur',
      startsOn: '2026-01-01',
      endsOn: '2026-12-31',
      configuration: {},
      communityIds: [],
    });
    await expect(
      service.record(memberContext(), userId, {
        participationId,
        actionDefinitionId: definitionId,
      }),
    ).rejects.toBeInstanceOf(InvalidRequestException);
  });

  it('returns the original action when the same idempotency key is replayed', async () => {
    actionRepository.findOne.mockResolvedValue(
      action({ idempotency_key: 'key-1' }),
    );
    const replayed = await service.record(
      memberContext(),
      userId,
      {
        participationId,
        actionDefinitionId: definitionId,
        occurredOn: '2026-10-13',
        quantity: 1,
        idempotencyKey: 'key-1',
      },
      new Date('2026-10-13T02:00:00.000Z'),
    );
    expect(replayed.id).toBe('action-1');
    expect(actionRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('rejects an idempotency key reused with a different payload', async () => {
    actionRepository.findOne.mockResolvedValue(
      action({ idempotency_key: 'key-1', quantity: 1 }),
    );
    await expect(
      service.record(
        memberContext(),
        userId,
        {
          participationId,
          actionDefinitionId: definitionId,
          occurredOn: '2026-10-13',
          quantity: 1,
          payload: { note: 'changed' },
          idempotencyKey: 'key-1',
        },
        new Date('2026-10-13T02:00:00.000Z'),
      ),
    ).rejects.toBeInstanceOf(ResourceConflictException);
  });

  it('forbids a member from recording on another user participation', async () => {
    participations.getParticipationRecord.mockResolvedValue({
      id: participationId,
      tenantId: tenantA,
      campaignId,
      userId: 'someone-else',
      communityId: null,
      status: ParticipationStatus.ENROLLED,
    });
    await expect(
      service.record(memberContext(), userId, {
        participationId,
        actionDefinitionId: definitionId,
      }),
    ).rejects.toBeInstanceOf(AccessForbiddenException);
  });

  it('hides another user’s action from a member', async () => {
    actionRepository.findOne.mockResolvedValue(
      action({ user_id: 'someone-else' }),
    );
    await expect(
      service.get(memberContext(), 'action-1'),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });

  it('auto-approves self-recorded submissions by default', async () => {
    actionRepository.findOne.mockResolvedValue(null);
    const now = new Date('2026-10-13T02:00:00.000Z');
    await service.record(
      memberContext(),
      userId,
      {
        participationId,
        actionDefinitionId: definitionId,
        occurredOn: '2026-10-12',
      },
      now,
    );
    const submissionSave = manager.save.mock.calls.find(
      (call) => call[0] === Submission,
    );
    expect(submissionSave?.[1]).toMatchObject({
      status: SubmissionStatus.APPROVED,
      reviewed_by_user_id: null,
      reviewed_at: now,
    });
  });

  it('leaves submissions pending when submissionReview is manual', async () => {
    actionRepository.findOne.mockResolvedValue(null);
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.STARTED,
      timezone: 'Asia/Kuala_Lumpur',
      startsOn: '2026-01-01',
      endsOn: '2026-12-31',
      configuration: {
        rulesStrategy: 'vegetarian',
        submissionReview: 'manual',
      },
      communityIds: [],
    });
    await service.record(
      memberContext(),
      userId,
      {
        participationId,
        actionDefinitionId: definitionId,
        occurredOn: '2026-10-12',
      },
      new Date('2026-10-13T02:00:00.000Z'),
    );
    const submissionSave = manager.save.mock.calls.find(
      (call) => call[0] === Submission,
    );
    expect(submissionSave?.[1]).toMatchObject({
      status: SubmissionStatus.SUBMITTED,
      reviewed_by_user_id: null,
      reviewed_at: null,
    });
  });

  it('lets a member cancel their own action', async () => {
    actionRepository.findOne.mockResolvedValue(action());
    const cancelled = await service.cancel(memberContext(), 'action-1', userId);
    expect(cancelled.status).toBe(ActionStatus.CANCELLED);
  });

  it('lets an admin approve a submission', async () => {
    submissionRepository.findOne.mockResolvedValue({
      id: 'submission-1',
      tenant_id: tenantA,
      action_id: 'action-1',
      status: SubmissionStatus.SUBMITTED,
      submitted_by_user_id: userId,
      reviewed_by_user_id: null,
      reviewed_at: null,
      review_note: null,
      created_at: new Date('2026-10-13T00:00:00.000Z'),
      updated_at: new Date('2026-10-13T00:00:00.000Z'),
    });
    actionRepository.findOne.mockResolvedValue(action());
    submissionRepository.save.mockImplementation(async (value) => value);
    const reviewed = await service.approveSubmission(
      adminContext(),
      'submission-1',
      'admin-user',
      'looks good',
    );
    expect(reviewed.status).toBe(SubmissionStatus.APPROVED);
    expect(reviewed.reviewNote).toBe('looks good');
  });

  it('lets an admin reject an auto-approved submission', async () => {
    submissionRepository.findOne.mockResolvedValue({
      id: 'submission-1',
      tenant_id: tenantA,
      action_id: 'action-1',
      status: SubmissionStatus.APPROVED,
      submitted_by_user_id: userId,
      reviewed_by_user_id: null,
      reviewed_at: new Date('2026-10-13T02:00:00.000Z'),
      review_note: null,
      created_at: new Date('2026-10-13T00:00:00.000Z'),
      updated_at: new Date('2026-10-13T00:00:00.000Z'),
    });
    actionRepository.findOne.mockResolvedValue(action());
    submissionRepository.save.mockImplementation(async (value) => value);
    const reviewed = await service.rejectSubmission(
      adminContext(),
      'submission-1',
      'admin-user',
      'not credible',
    );
    expect(reviewed.status).toBe(SubmissionStatus.REJECTED);
    expect(reviewed.reviewedByUserId).toBe('admin-user');
  });
});
