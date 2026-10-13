import { Inject, Injectable, Optional, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { toIsoDate } from '../../campaigns/application/timezone.js';
import { CommunityService } from '../../communities/application/community.service.js';
import { Commitment } from '../../commitments/domain/commitment.entity.js';
import { Participation } from '../../participation/domain/participation.entity.js';
import { ParticipationService } from '../../participation/application/participation.service.js';
import type { CompletionStatus } from './completion.js';
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
  units: UnitProgress[];
}

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
    );
    const snapshot = snapshots.find(
      (row) => row.participationId === participation.id,
    );
    if (!snapshot || !this.canViewParticipant(tenant, snapshot.userId)) {
      throw new ResourceNotFoundException('Progress not found');
    }
    return this.toParticipantResponse(tenant.tenantId, campaign, snapshot);
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

  async computeCampaignSnapshots(
    tenantId: string,
    campaign: {
      id: string;
      timezone: string;
      startsOn: string | null;
      endsOn: string | null;
      configuration: Record<string, unknown>;
    },
  ): Promise<ParticipantProgressSnapshot[]> {
    const [participations, commitments, actions, submissions, definitions] =
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

    const commitmentByParticipation = new Map(
      commitments.map((row) => [row.participation_id, row]),
    );
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
      const commitment: CountableCommitment | null = commitmentRow
        ? {
            id: commitmentRow.id,
            participationId: commitmentRow.participation_id,
            typeKey: commitmentRow.type_key,
            targetValue: commitmentRow.target_value,
            unit: commitmentRow.unit,
            payload: commitmentRow.payload,
          }
        : null;
      return computeParticipantProgress(
        countable,
        commitment,
        countableActions,
        rules,
        context,
      );
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
    snapshot: ParticipantProgressSnapshot,
  ): ParticipantProgressResponse {
    return {
      scope: 'participant',
      customerId: tenantId,
      campaignId: campaign.id,
      participationId: snapshot.participationId,
      userId: snapshot.userId,
      communityId: snapshot.communityId,
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
    snapshots: ParticipantProgressSnapshot[],
  ): AggregateProgressResponse {
    const units = aggregateUnitProgress(snapshots);
    return {
      scope,
      customerId: tenantId,
      campaignId: campaign.id,
      communityId,
      timezone: campaign.timezone,
      participantCount: snapshots.length,
      committedParticipantCount: snapshots.filter(
        (snapshot) => snapshot.commitment != null,
      ).length,
      units,
    };
  }
}
