import { Inject, Injectable, Optional, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ResourceNotFoundException } from '../../../shared/errors/domain-http.exceptions.js';
import { ActionDefinition } from '../../actions/domain/action-definition.entity.js';
import { Action, ActionStatus } from '../../actions/domain/action.entity.js';
import {
  Submission,
  SubmissionStatus,
} from '../../actions/domain/submission.entity.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import {
  CAMPAIGN_RULE_STRATEGIES,
  GenericCampaignRules,
  resolveCampaignRules,
  type CampaignRuleStrategy,
} from '../../campaigns/application/campaign-rule-strategy.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import {
  calendarDateInTimeZone,
  toIsoDate,
} from '../../campaigns/application/timezone.js';
import type { SupportedLocale } from '../../localization/application/locale-catalog.js';
import { MilestoneService } from '../../milestones/application/milestone.service.js';
import { CommunityService } from '../../communities/application/community.service.js';
import { Commitment } from '../../commitments/domain/commitment.entity.js';
import { representativeCommitments } from '../../commitments/domain/commitment-periods.js';
import {
  Participation,
  ParticipationStatus,
} from '../../participation/domain/participation.entity.js';
import {
  countEngagements,
  deriveEngagement,
  type ParticipationEngagement,
} from '../../participation/domain/participation-engagement.js';
import { ParticipationService } from '../../participation/application/participation.service.js';
import type { CompletionStatus } from './completion.js';
import {
  computeParticipationPeriods,
  type ParticipationPeriod,
  type PeriodEntry,
} from './participation-periods.js';
import {
  aggregateUnitProgress,
  computeParticipantProgress,
  type CountableAction,
  type CountableCommitment,
  type CountableParticipation,
  type ParticipantProgressSnapshot,
  type UnitProgress,
} from './progress-math.js';

export interface ParticipantProgressResponse {
  scope: 'participant';
  customerId: string;
  campaignId: string;
  participationId: string;
  userId: string;
  communityId: string | null;
  engagement: ParticipationEngagement;
  timezone: string;
  commitment: ParticipantProgressSnapshot['commitment'];
  unit: string | null;
  achievedValue: number;
  targetValue: number;
  completionPercent: number | null;
  completionStatus: CompletionStatus;
  approvedActionCount: number;
  distinctApprovedDays: number;
  byUnit: UnitProgress[];
}

export interface AchievementResponse {
  customerId: string;
  campaignId: string;
  participationId: string;
  userId: string;
  unit: string | null;
  achievedValue: number;
  approvedActionCount: number;
  distinctApprovedDays: number;
}

export interface AggregateProgressResponse {
  scope: 'campaign' | 'community';
  customerId: string;
  campaignId: string;
  communityId: string | null;
  timezone: string;
  participantCount: number;
  committedParticipantCount: number;
  notTakingPartCount: number;
  awaitingCommitmentCount: number;
  units: UnitProgress[];
}

export type CampaignParticipantSnapshot = ParticipantProgressSnapshot & {
  engagement: ParticipationEngagement;
};

@Injectable()
export class ProgressService {
  private readonly genericRules = new GenericCampaignRules();

  constructor(
    @InjectRepository(Action)
    private readonly actionRepository: Repository<Action>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(ActionDefinition)
    private readonly definitionRepository: Repository<ActionDefinition>,
    @InjectRepository(Commitment)
    private readonly commitmentRepository: Repository<Commitment>,
    @InjectRepository(Participation)
    private readonly participationRepository: Repository<Participation>,
    @Inject(forwardRef(() => CampaignService))
    private readonly campaigns: CampaignService,
    @Inject(forwardRef(() => ParticipationService))
    private readonly participations: ParticipationService,
    @Inject(forwardRef(() => CommunityService))
    private readonly communities: CommunityService,
    @Inject(forwardRef(() => MilestoneService))
    private readonly milestones: MilestoneService,
    @Optional()
    @Inject(CAMPAIGN_RULE_STRATEGIES)
    private readonly strategies: CampaignRuleStrategy[] | null,
  ) {}

  async getParticipantProgress(
    tenant: TenantContext,
    participationId: string,
  ): Promise<ParticipantProgressResponse> {
    const participation = await this.participations.getParticipationRecord(
      tenant,
      participationId,
    );
    const campaign = await this.campaigns.getCampaignRecord(
      tenant,
      participation.campaignId,
    );
    const snapshots = await this.computeCampaignSnapshots(
      tenant.tenantId,
      campaign,
      { includeParticipationId: participation.id },
    );
    const snapshot = snapshots.find(
      (row) => row.participationId === participation.id,
    );
    if (!snapshot || !this.canViewParticipant(tenant, snapshot.userId)) {
      throw new ResourceNotFoundException('Progress not found');
    }
    return this.toParticipantResponse(tenant.tenantId, campaign, snapshot);
  }

  /** Own participation, or any in the tenant for participation managers. */
  async listParticipationPeriods(
    tenant: TenantContext,
    participationId: string,
    locale: SupportedLocale = 'en',
    now: Date = new Date(),
  ): Promise<ParticipationPeriod[]> {
    const participation = await this.participations.getParticipationRecord(
      tenant,
      participationId,
      [PERMISSIONS.SUBMISSIONS_UPDATE],
    );
    const campaign = await this.campaigns.getCampaignRecord(
      tenant,
      participation.campaignId,
    );
    const [periods, commitments, actions, definitions] = await Promise.all([
      this.milestones.periodsForCampaign(campaign, locale),
      this.commitmentRepository.find({
        where: {
          tenant_id: tenant.tenantId,
          participation_id: participation.id,
        },
      }),
      this.actionRepository.find({
        where: {
          tenant_id: tenant.tenantId,
          participation_id: participation.id,
          status: ActionStatus.RECORDED,
        },
      }),
      this.definitionRepository.find({
        where: { tenant_id: tenant.tenantId, campaign_id: campaign.id },
      }),
    ]);
    const submissions =
      actions.length === 0
        ? []
        : await this.submissionRepository.find({
            where: {
              tenant_id: tenant.tenantId,
              action_id: In(actions.map((action) => action.id)),
            },
          });
    const submissionByAction = new Map(
      submissions.map((row) => [row.action_id, row.status]),
    );
    const unitByDefinition = new Map(
      definitions.map((definition) => [definition.id, definition.unit]),
    );
    const entries: PeriodEntry[] = actions.flatMap((action) => {
      const unit = unitByDefinition.get(action.action_definition_id);
      const submissionStatus = submissionByAction.get(action.id);
      if (!unit || !submissionStatus) {
        return [];
      }
      return [
        {
          occurredOn: toIsoDate(action.occurred_on) ?? action.occurred_on,
          unit,
          quantity: action.quantity,
          submissionStatus,
        },
      ];
    });
    const rules = resolveCampaignRules(
      campaign.configuration,
      this.strategyList(),
      this.genericRules,
    );
    return computeParticipationPeriods(
      periods,
      commitments.map((row) => ({
        id: row.id,
        decision: row.decision,
        typeKey: row.type_key,
        targetValue: row.target_value,
        unit: row.unit,
        payload: row.payload,
        validFrom: toIsoDate(row.valid_from),
        validTo: toIsoDate(row.valid_to),
      })),
      entries,
      rules,
      {
        timezone: campaign.timezone,
        today: calendarDateInTimeZone(now, campaign.timezone),
      },
    );
  }

  async getParticipantAchievement(
    tenant: TenantContext,
    participationId: string,
  ): Promise<AchievementResponse> {
    const progress = await this.getParticipantProgress(tenant, participationId);
    return {
      customerId: progress.customerId,
      campaignId: progress.campaignId,
      participationId: progress.participationId,
      userId: progress.userId,
      unit: progress.unit,
      achievedValue: progress.achievedValue,
      approvedActionCount: progress.approvedActionCount,
      distinctApprovedDays: progress.distinctApprovedDays,
    };
  }

  async listCampaignAchievements(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<AchievementResponse[]> {
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    const snapshots = await this.computeCampaignSnapshots(
      tenant.tenantId,
      campaign,
    );
    return snapshots
      .filter((snapshot) => this.canViewParticipant(tenant, snapshot.userId))
      .map((snapshot) => ({
        customerId: tenant.tenantId,
        campaignId: campaign.id,
        participationId: snapshot.participationId,
        userId: snapshot.userId,
        unit: snapshot.unit,
        achievedValue: snapshot.achievedValue,
        approvedActionCount: snapshot.approvedActionCount,
        distinctApprovedDays: snapshot.distinctApprovedDays,
      }));
  }

  async getCampaignProgress(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<AggregateProgressResponse> {
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    const snapshots = await this.computeCampaignSnapshots(
      tenant.tenantId,
      campaign,
    );
    return this.toAggregateResponse(
      tenant.tenantId,
      campaign,
      'campaign',
      null,
      snapshots,
    );
  }

  async getCommunityProgress(
    tenant: TenantContext,
    campaignId: string,
    communityId: string,
  ): Promise<AggregateProgressResponse> {
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    await this.communities.get(tenant, communityId);
    const descendantIds = await this.communities.listDescendantIds(communityId);
    const subtree = new Set([communityId, ...descendantIds]);
    const snapshots = (
      await this.computeCampaignSnapshots(tenant.tenantId, campaign)
    ).filter(
      (snapshot) =>
        snapshot.communityId != null && subtree.has(snapshot.communityId),
    );
    return this.toAggregateResponse(
      tenant.tenantId,
      campaign,
      'community',
      communityId,
      snapshots,
    );
  }

  /**
   * Only enrolled participations count. `includeParticipationId` lets a single
   * withdrawn participant still read their own history without it entering
   * any aggregate.
   */
  async computeCampaignSnapshots(
    tenantId: string,
    campaign: {
      id: string;
      timezone: string;
      startsOn: string | null;
      endsOn: string | null;
      configuration: Record<string, unknown>;
    },
    options: { includeParticipationId?: string } = {},
  ): Promise<CampaignParticipantSnapshot[]> {
    const [allParticipations, commitments, actions, submissions, definitions] =
      await Promise.all([
        this.participationRepository.find({
          where: { tenant_id: tenantId, campaign_id: campaign.id },
        }),
        this.commitmentRepository.find({
          where: { tenant_id: tenantId, campaign_id: campaign.id },
        }),
        this.actionRepository.find({
          where: {
            tenant_id: tenantId,
            campaign_id: campaign.id,
            status: ActionStatus.RECORDED,
          },
        }),
        this.submissionRepository.find({
          where: { tenant_id: tenantId, status: SubmissionStatus.APPROVED },
        }),
        this.definitionRepository.find({
          where: { tenant_id: tenantId, campaign_id: campaign.id },
        }),
      ]);
    const participations = allParticipations.filter(
      (row) =>
        row.status === ParticipationStatus.ENROLLED ||
        row.id === options.includeParticipationId,
    );

    const approvedActionIds = new Set(
      submissions
        .filter(
          (row) =>
            row.status === SubmissionStatus.APPROVED &&
            actions.some((action) => action.id === row.action_id),
        )
        .map((row) => row.action_id),
    );
    const definitionById = new Map(
      definitions.map((definition) => [definition.id, definition]),
    );
    const countableActions: CountableAction[] = actions
      .filter(
        (action) =>
          action.status === ActionStatus.RECORDED &&
          approvedActionIds.has(action.id),
      )
      .map((action) => {
        const definition = definitionById.get(action.action_definition_id);
        const participation = participations.find(
          (row) => row.id === action.participation_id,
        );
        return {
          participationId: action.participation_id,
          userId: action.user_id,
          communityId: participation?.community_id ?? null,
          unit: definition?.unit ?? '',
          quantity: action.quantity,
          occurredOn: toIsoDate(action.occurred_on) ?? action.occurred_on,
        };
      })
      .filter((action) => action.unit.length > 0);

    const commitmentByParticipation = representativeCommitments(commitments);
    const rules = resolveCampaignRules(
      campaign.configuration,
      this.strategyList(),
      this.genericRules,
    );
    const context = {
      startsOn: campaign.startsOn,
      endsOn: campaign.endsOn,
      timezone: campaign.timezone,
    };

    return participations.map((participation) => {
      const countable: CountableParticipation = {
        id: participation.id,
        userId: participation.user_id,
        communityId: participation.community_id,
      };
      const commitmentRow = commitmentByParticipation.get(participation.id);
      const engagement = deriveEngagement(
        participation.status,
        commitmentRow?.decision ?? null,
      );
      if (engagement === 'not_taking_part') {
        return {
          ...computeParticipantProgress(countable, null, [], rules, context),
          engagement,
        };
      }
      const commitment: CountableCommitment | null =
        commitmentRow &&
        commitmentRow.target_value != null &&
        commitmentRow.unit
          ? {
              id: commitmentRow.id,
              participationId: commitmentRow.participation_id,
              typeKey: commitmentRow.type_key,
              targetValue: commitmentRow.target_value,
              unit: commitmentRow.unit,
              payload: commitmentRow.payload,
            }
          : null;
      return {
        ...computeParticipantProgress(
          countable,
          commitment,
          countableActions,
          rules,
          context,
        ),
        engagement,
      };
    });
  }

  private canViewParticipant(
    tenant: TenantContext,
    ownerUserId: string,
  ): boolean {
    if (this.canViewOthers(tenant)) {
      return true;
    }
    return tenant.memberships.some(
      (membership) => membership.isActive && membership.userId === ownerUserId,
    );
  }

  private canViewOthers(tenant: TenantContext): boolean {
    return (
      tenant.permissions.has(PERMISSIONS.ACTIONS_UPDATE) ||
      tenant.permissions.has(PERMISSIONS.PARTICIPATIONS_UPDATE)
    );
  }

  private strategyList(): CampaignRuleStrategy[] {
    const value = this.strategies;
    if (!value) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  private toParticipantResponse(
    tenantId: string,
    campaign: { id: string; timezone: string },
    snapshot: CampaignParticipantSnapshot,
  ): ParticipantProgressResponse {
    return {
      scope: 'participant',
      customerId: tenantId,
      campaignId: campaign.id,
      participationId: snapshot.participationId,
      userId: snapshot.userId,
      communityId: snapshot.communityId,
      engagement: snapshot.engagement,
      timezone: campaign.timezone,
      commitment: snapshot.commitment,
      unit: snapshot.unit,
      achievedValue: snapshot.achievedValue,
      targetValue: snapshot.targetValue,
      completionPercent: snapshot.completionPercent,
      completionStatus: snapshot.completionStatus,
      approvedActionCount: snapshot.approvedActionCount,
      distinctApprovedDays: snapshot.distinctApprovedDays,
      byUnit: snapshot.byUnit,
    };
  }

  private toAggregateResponse(
    tenantId: string,
    campaign: { id: string; timezone: string },
    scope: 'campaign' | 'community',
    communityId: string | null,
    snapshots: CampaignParticipantSnapshot[],
  ): AggregateProgressResponse {
    const units = aggregateUnitProgress(snapshots);
    const counts = countEngagements(
      snapshots.map((snapshot) => snapshot.engagement),
    );
    return {
      scope,
      customerId: tenantId,
      campaignId: campaign.id,
      communityId,
      timezone: campaign.timezone,
      participantCount: counts.enrolled,
      committedParticipantCount: counts.takingPart,
      notTakingPartCount: counts.notTakingPart,
      awaitingCommitmentCount: counts.awaitingCommitment,
      units,
    };
  }
}
