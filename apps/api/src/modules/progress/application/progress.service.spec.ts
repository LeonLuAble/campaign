import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceNotFoundException } from '../../../shared/errors/domain-http.exceptions.js';
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
import { CAMPAIGN_RULE_STRATEGIES } from '../../campaigns/application/campaign-rule-strategy.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { CampaignStatus } from '../../campaigns/domain/campaign.entity.js';
import { CommunityService } from '../../communities/application/community.service.js';
import {
  Commitment,
  CommitmentDecision,
} from '../../commitments/domain/commitment.entity.js';
import { Participation } from '../../participation/domain/participation.entity.js';
import { ParticipationStatus } from '../../participation/domain/participation.entity.js';
import { MilestoneService } from '../../milestones/application/milestone.service.js';
import { ParticipationService } from '../../participation/application/participation.service.js';
import { VegetarianRuleStrategy } from '../../vegetarian/application/vegetarian-rules.js';
import { ProgressService } from './progress.service.js';

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
      PERMISSIONS.PROGRESS_READ,
      PERMISSIONS.ACHIEVEMENTS_READ,
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
      PERMISSIONS.PROGRESS_READ,
      PERMISSIONS.ACHIEVEMENTS_READ,
      PERMISSIONS.ACTIONS_UPDATE,
      PERMISSIONS.PARTICIPATIONS_UPDATE,
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

function commitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: 'commitment-1',
    tenant_id: tenantA,
    campaign_id: campaignId,
    participation_id: participationId,
    decision: CommitmentDecision.COMMITTED,
    type_key: 'fa_yuan_su',
    target_value: 10,
    unit: 'days',
    payload: {},
    valid_from: null,
    valid_to: null,
    period_milestone_id: null,
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

describe('ProgressService', () => {
  let service: ProgressService;
  const actionRepository = { find: vi.fn() };
  const submissionRepository = { find: vi.fn() };
  const definitionRepository = { find: vi.fn() };
  const commitmentRepository = { find: vi.fn() };
  const participationRepository = { find: vi.fn() };
  const campaigns = { getCampaignRecord: vi.fn() };
  const participations = { getParticipationRecord: vi.fn() };
  const communities = { get: vi.fn(), listDescendantIds: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    campaigns.getCampaignRecord.mockResolvedValue({
      id: campaignId,
      tenantId: tenantA,
      status: CampaignStatus.STARTED,
      timezone: 'Asia/Kuala_Lumpur',
      startsOn: '2026-01-01',
      endsOn: '2026-01-31',
      configuration: { rulesStrategy: 'vegetarian' },
      communityIds: [],
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
      {
        id: definitionId,
        tenant_id: tenantA,
        campaign_id: campaignId,
        key: 'vegetarian_day',
        name: 'Vegetarian day',
        unit: 'days',
      },
    ]);
    participationRepository.find.mockResolvedValue([
      participation(),
      participation({
        id: otherParticipationId,
        user_id: otherUserId,
        community_id: childCommunityId,
      }),
    ]);
    commitmentRepository.find.mockResolvedValue([
      commitment(),
      commitment({
        id: 'commitment-2',
        participation_id: otherParticipationId,
        target_value: 10,
      }),
    ]);
    actionRepository.find.mockResolvedValue([
      recordedAction('a1', participationId, userId, '2026-01-02'),
      recordedAction('a2', participationId, userId, '2026-01-03'),
      recordedAction('a3', otherParticipationId, otherUserId, '2026-01-02'),
    ]);
    submissionRepository.find.mockResolvedValue([
      approvedSubmission('a1'),
      approvedSubmission('a2'),
      approvedSubmission('a3'),
    ]);

    const module = await Test.createTestingModule({
      providers: [
        ProgressService,
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
          provide: getRepositoryToken(Commitment),
          useValue: commitmentRepository,
        },
        {
          provide: getRepositoryToken(Participation),
          useValue: participationRepository,
        },
        { provide: CampaignService, useValue: campaigns },
        { provide: ParticipationService, useValue: participations },
        { provide: CommunityService, useValue: communities },
        {
          provide: MilestoneService,
          useValue: { periodsForCampaign: vi.fn().mockResolvedValue([]) },
        },
        {
          provide: CAMPAIGN_RULE_STRATEGIES,
          useValue: [new VegetarianRuleStrategy()],
        },
      ],
    }).compile();
    service = module.get(ProgressService);
  });

  it('returns a member their own progress against the commitment', async () => {
    const progress = await service.getParticipantProgress(
      memberContext(),
      participationId,
    );
    expect(progress).toMatchObject({
      scope: 'participant',
      participationId,
      userId,
      achievedValue: 2,
      targetValue: 10,
      completionPercent: 20,
      completionStatus: 'in_progress',
      timezone: 'Asia/Kuala_Lumpur',
    });
  });

  it('recalculates after a rejection by ignoring unapproved submissions', async () => {
    submissionRepository.find.mockResolvedValue([
      approvedSubmission('a1'),
      {
        ...approvedSubmission('a2'),
        status: SubmissionStatus.REJECTED,
      },
      approvedSubmission('a3'),
    ]);
    const progress = await service.getParticipantProgress(
      memberContext(),
      participationId,
    );
    expect(progress.achievedValue).toBe(1);
    expect(progress.completionPercent).toBe(10);
  });

  it('recalculates after a cancel by ignoring cancelled actions', async () => {
    actionRepository.find.mockResolvedValue([
      recordedAction('a1', participationId, userId, '2026-01-02'),
    ]);
    submissionRepository.find.mockResolvedValue([approvedSubmission('a1')]);
    const progress = await service.getParticipantProgress(
      memberContext(),
      participationId,
    );
    expect(progress.achievedValue).toBe(1);
  });

  it('hides other participants from member achievement lists', async () => {
    const listed = await service.listCampaignAchievements(
      memberContext(),
      campaignId,
    );
    expect(listed.map((row) => row.userId)).toEqual([userId]);
  });

  it('lets admins see every achievement while campaign aggregates stay anonymous', async () => {
    const listed = await service.listCampaignAchievements(
      adminContext(),
      campaignId,
    );
    expect(listed.map((row) => row.userId).sort()).toEqual(
      [otherUserId, userId].sort(),
    );
    const aggregate = await service.getCampaignProgress(
      memberContext(),
      campaignId,
    );
    expect(aggregate.scope).toBe('campaign');
    expect(aggregate.participantCount).toBe(2);
    expect(aggregate.units[0]).toMatchObject({
      unit: 'days',
      achievedValue: 3,
      targetValue: 20,
    });
    expect(JSON.stringify(aggregate)).not.toContain(userId);
    expect(JSON.stringify(aggregate)).not.toContain(participationId);
  });

  it('aggregates a community subtree without including other branches', async () => {
    const progress = await service.getCommunityProgress(
      memberContext(),
      campaignId,
      communityId,
    );
    expect(progress.scope).toBe('community');
    expect(progress.communityId).toBe(communityId);
    expect(progress.participantCount).toBe(2);
    expect(progress.units[0].achievedValue).toBe(3);
  });

  it('reports the new engagement counts on aggregates', async () => {
    const aggregate = await service.getCampaignProgress(
      memberContext(),
      campaignId,
    );
    expect(aggregate).toMatchObject({
      participantCount: 2,
      committedParticipantCount: 2,
      notTakingPartCount: 0,
      awaitingCommitmentCount: 0,
    });
  });

  it('excludes withdrawn participations from participantCount and progress', async () => {
    participationRepository.find.mockResolvedValue([
      participation(),
      participation({
        id: otherParticipationId,
        user_id: otherUserId,
        community_id: childCommunityId,
        status: ParticipationStatus.WITHDRAWN,
        withdrawn_at: new Date('2026-01-05T00:00:00.000Z'),
      }),
    ]);
    const aggregate = await service.getCampaignProgress(
      memberContext(),
      campaignId,
    );
    expect(aggregate.participantCount).toBe(1);
    expect(aggregate.committedParticipantCount).toBe(1);
    expect(aggregate.units[0]).toMatchObject({
      achievedValue: 2,
      targetValue: 10,
      completionPercent: 20,
    });

    const community = await service.getCommunityProgress(
      memberContext(),
      campaignId,
      communityId,
    );
    expect(community.participantCount).toBe(1);
    expect(community.units[0].achievedValue).toBe(2);

    const achievements = await service.listCampaignAchievements(
      adminContext(),
      campaignId,
    );
    expect(achievements.map((row) => row.participationId)).toEqual([
      participationId,
    ]);
  });

  it('still shows a withdrawn participant their own history', async () => {
    participations.getParticipationRecord.mockResolvedValue({
      id: participationId,
      tenantId: tenantA,
      campaignId,
      userId,
      communityId,
      status: ParticipationStatus.WITHDRAWN,
    });
    participationRepository.find.mockResolvedValue([
      participation({
        status: ParticipationStatus.WITHDRAWN,
        withdrawn_at: new Date('2026-01-05T00:00:00.000Z'),
      }),
    ]);
    const progress = await service.getParticipantProgress(
      memberContext(),
      participationId,
    );
    expect(progress).toMatchObject({
      engagement: 'withdrawn',
      achievedValue: 2,
    });
  });

  it('never lowers the community percentage when a member is not taking part', async () => {
    const before = await service.getCommunityProgress(
      memberContext(),
      campaignId,
      communityId,
    );
    commitmentRepository.find.mockResolvedValue([
      commitment(),
      commitment({
        id: 'commitment-2',
        participation_id: otherParticipationId,
        decision: CommitmentDecision.NOT_TAKING_PART,
        type_key: null,
        target_value: 0,
        unit: null,
      }),
    ]);
    const after = await service.getCommunityProgress(
      memberContext(),
      campaignId,
      communityId,
    );
    expect(before.units[0]).toMatchObject({
      achievedValue: 3,
      targetValue: 20,
      completionPercent: 15,
    });
    expect(after.units[0]).toMatchObject({
      achievedValue: 2,
      targetValue: 10,
      completionPercent: 20,
    });
    expect(after.units[0].completionPercent).toBeGreaterThanOrEqual(
      before.units[0].completionPercent ?? 0,
    );
    expect(after).toMatchObject({
      participantCount: 2,
      committedParticipantCount: 1,
      notTakingPartCount: 1,
      awaitingCommitmentCount: 0,
    });
  });

  it('gives a not-taking-part participant zero target and zero achieved', async () => {
    commitmentRepository.find.mockResolvedValue([
      commitment({
        decision: CommitmentDecision.NOT_TAKING_PART,
        type_key: null,
        target_value: 0,
        unit: null,
      }),
    ]);
    const progress = await service.getParticipantProgress(
      memberContext(),
      participationId,
    );
    expect(progress).toMatchObject({
      engagement: 'not_taking_part',
      commitment: null,
      achievedValue: 0,
      targetValue: 0,
      byUnit: [],
    });
  });

  it('counts enrolled members without a commitment as awaiting', async () => {
    commitmentRepository.find.mockResolvedValue([commitment()]);
    const aggregate = await service.getCampaignProgress(
      memberContext(),
      campaignId,
    );
    expect(aggregate).toMatchObject({
      participantCount: 2,
      committedParticipantCount: 1,
      notTakingPartCount: 0,
      awaitingCommitmentCount: 1,
    });
  });

  it('does not treat a missing participation as visible progress', async () => {
    participations.getParticipationRecord.mockRejectedValue(
      new ResourceNotFoundException('Participation not found'),
    );
    await expect(
      service.getParticipantProgress(memberContext(), participationId),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
  });
});
