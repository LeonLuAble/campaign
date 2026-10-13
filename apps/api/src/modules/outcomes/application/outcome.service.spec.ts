import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionDefinition } from '../../actions/domain/action-definition.entity.js';
import {
  Action,
  ActionStatus,
  PrivacyLevel,
} from '../../actions/domain/action.entity.js';
import {
  Submission,
  SubmissionStatus,
} from '../../actions/domain/submission.entity.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { CampaignStatus } from '../../campaigns/domain/campaign.entity.js';
import { CommunityService } from '../../communities/application/community.service.js';
import { MeasurementDefinitionService } from '../../measurements/application/measurement-definition.service.js';
import { Participation } from '../../participation/domain/participation.entity.js';
import { ParticipationStatus } from '../../participation/domain/participation.entity.js';
import { ParticipationService } from '../../participation/application/participation.service.js';
import { ImpactFactorService } from './impact-factor.service.js';
import { OutcomeService } from './outcome.service.js';

const tenantA = '11111111-1111-4111-8111-111111111111';
const campaignId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const userId = '55555555-5555-4555-8555-555555555555';
const otherUserId = '66666666-6666-4666-8666-666666666666';
const participationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otherParticipationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const communityId = '77777777-7777-4777-8777-777777777777';
const childCommunityId = '88888888-8888-4888-8888-888888888888';
const definitionId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

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
      PERMISSIONS.MEASUREMENTS_READ,
      PERMISSIONS.OUTCOMES_READ,
    ]),
  };
}

function participation(overrides: Partial<Participation> = {}): Participation {
  return {
    id: participationId,
    tenant_id: tenantA,
    campaign_id: campaignId,
    user_id: userId,
    community_id: communityId,
    status: ParticipationStatus.ENROLLED,
    enrolled_at: new Date('2026-01-01T00:00:00.000Z'),
    withdrawn_at: null,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
    updated_at: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function recordedAction(
  id: string,
  ownerParticipationId: string,
  ownerUserId: string,
  occurredOn: string,
): Action {
  return {
    id,
    tenant_id: tenantA,
    campaign_id: campaignId,
    participation_id: ownerParticipationId,
    user_id: ownerUserId,
    action_definition_id: definitionId,
    occurred_on: occurredOn,
    quantity: 1,
    privacy_level: PrivacyLevel.PRIVATE,
    status: ActionStatus.RECORDED,
    payload: {},
    idempotency_key: null,
    recorded_by_user_id: ownerUserId,
    cancelled_at: null,
    cancelled_by_user_id: null,
    corrected_at: null,
    corrected_by_user_id: null,
    created_at: new Date(`${occurredOn}T00:00:00.000Z`),
    updated_at: new Date(`${occurredOn}T00:00:00.000Z`),
  };
}

function approvedSubmission(actionId: string): Submission {
  return {
    id: `sub-${actionId}`,
    tenant_id: tenantA,
    action_id: actionId,
    status: SubmissionStatus.APPROVED,
    submitted_by_user_id: userId,
    reviewed_by_user_id: null,
    reviewed_at: new Date('2026-01-02T00:00:00.000Z'),
    review_note: null,
    created_at: new Date('2026-01-02T00:00:00.000Z'),
    updated_at: new Date('2026-01-02T00:00:00.000Z'),
  };
}

describe('OutcomeService', () => {
  let service: OutcomeService;
  const actionRepository = { find: vi.fn() };
  const submissionRepository = { find: vi.fn() };
  const definitionRepository = { find: vi.fn() };
  const participationRepository = { find: vi.fn() };
  const campaigns = { getCampaignRecord: vi.fn() };
  const participations = { getParticipationRecord: vi.fn() };
  const communities = { get: vi.fn(), listDescendantIds: vi.fn() };
  const measurementDefinitions = { listActiveRows: vi.fn() };
  const impactFactors = { listApplicableRows: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.STARTED,
      timezone: 'Asia/Kuala_Lumpur',
    });
    participations.getParticipationRecord.mockResolvedValue({
      id: participationId,
      tenantId: tenantA,
      campaignId,
      userId,
      communityId,
      status: ParticipationStatus.ENROLLED,
    });
    communities.get.mockResolvedValue({ id: communityId });
    communities.listDescendantIds.mockResolvedValue([childCommunityId]);
    definitionRepository.find.mockResolvedValue([
      { id: definitionId, unit: 'days' },
    ]);
    participationRepository.find.mockResolvedValue([
      participation(),
      participation({
        id: otherParticipationId,
        user_id: otherUserId,
        community_id: childCommunityId,
      }),
    ]);
    actionRepository.find.mockResolvedValue([
      recordedAction('a1', participationId, userId, '2026-10-12'),
      recordedAction('a2', otherParticipationId, otherUserId, '2026-10-13'),
    ]);
    submissionRepository.find.mockResolvedValue([
      approvedSubmission('a1'),
      approvedSubmission('a2'),
    ]);
    measurementDefinitions.listActiveRows.mockResolvedValue([
      {
        id: 'def-days',
        key: 'days',
        source_unit: 'days',
        is_active: true,
      },
    ]);
    impactFactors.listApplicableRows.mockResolvedValue([
      {
        id: 'factor-1',
        campaign_id: campaignId,
        source_unit: 'days',
        outcome_metric: 'co2_kg',
        outcome_unit: 'kg',
        factor_value: 2,
        version: 1,
        source: 'Cited source',
        effective_from: '2020-01-01',
        effective_to: null,
        is_active: true,
      },
    ]);

    const module = await Test.createTestingModule({
      providers: [
        OutcomeService,
        { provide: getRepositoryToken(Action), useValue: actionRepository },
        {
          provide: getRepositoryToken(Submission),
          useValue: submissionRepository,
        },
        {
          provide: getRepositoryToken(ActionDefinition),
          useValue: definitionRepository,
        },
        {
          provide: getRepositoryToken(Participation),
          useValue: participationRepository,
        },
        { provide: CampaignService, useValue: campaigns },
        { provide: ParticipationService, useValue: participations },
        { provide: CommunityService, useValue: communities },
        {
          provide: MeasurementDefinitionService,
          useValue: measurementDefinitions,
        },
        { provide: ImpactFactorService, useValue: impactFactors },
      ],
    }).compile();
    service = module.get(OutcomeService);
  });

  it('returns a member only their own measurements and outcomes', async () => {
    const measurements = await service.getParticipantMeasurements(
      memberContext(),
      participationId,
    );
    expect(measurements.measurements[0].quantity).toBe(1);
    expect(measurements.userId).toBe(userId);
    const outcomes = await service.getParticipantOutcomes(
      memberContext(),
      participationId,
    );
    expect(outcomes.outcomes[0]).toMatchObject({
      outcomeMetric: 'co2_kg',
      value: 2,
    });
    expect(outcomes.outcomes[0].contributions[0].source).toBe('Cited source');
  });

  it('keeps campaign aggregates anonymous and includes private approved actions', async () => {
    const aggregate = await service.getCampaignOutcomes(
      memberContext(),
      campaignId,
    );
    expect(aggregate.scope).toBe('campaign');
    expect(aggregate.userId).toBeNull();
    expect(aggregate.participationId).toBeNull();
    expect(aggregate.outcomes[0].value).toBe(4);
    expect(JSON.stringify(aggregate)).not.toContain(userId);
    expect(JSON.stringify(aggregate)).not.toContain(participationId);
  });

  it('ignores unapproved submissions and cancelled actions', async () => {
    submissionRepository.find.mockResolvedValue([approvedSubmission('a1')]);
    actionRepository.find.mockResolvedValue([
      recordedAction('a1', participationId, userId, '2026-10-12'),
    ]);
    const measurements = await service.getCampaignMeasurements(
      memberContext(),
      campaignId,
    );
    expect(measurements.measurements[0].quantity).toBe(1);
  });
});
