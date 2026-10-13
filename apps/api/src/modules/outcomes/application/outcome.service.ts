import { Inject, Injectable, forwardRef } from '@nestjs/common';
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
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { toIsoDate } from '../../campaigns/application/timezone.js';
import { CommunityService } from '../../communities/application/community.service.js';
import { MeasurementDefinitionService } from '../../measurements/application/measurement-definition.service.js';
import { Participation } from '../../participation/domain/participation.entity.js';
import { ParticipationService } from '../../participation/application/participation.service.js';
import { ImpactFactorService } from './impact-factor.service.js';
import {
  computeMeasurements,
  computeOutcomes,
  computeTimeSeries,
  type ApprovedActionRow,
  type ImpactFactorRow,
  type MeasurementDefinitionRow,
  type MeasurementTotal,
  type OutcomeTotal,
  type TimeSeriesGranularity,
  type TimeSeriesResult,
} from './outcome-math.js';

export interface MeasurementSnapshot {
  scope: 'participant' | 'campaign' | 'community';
  customerId: string;
  campaignId: string;
  participationId: string | null;
  userId: string | null;
  communityId: string | null;
  timezone: string;
  measurements: MeasurementTotal[];
}

export interface OutcomeSnapshot {
  scope: 'participant' | 'campaign' | 'community';
  customerId: string;
  campaignId: string;
  participationId: string | null;
  userId: string | null;
  communityId: string | null;
  timezone: string;
  outcomes: OutcomeTotal[];
}

@Injectable()
export class OutcomeService {
  constructor(
    @InjectRepository(Action)
    private readonly actionRepository: Repository<Action>,
    @InjectRepository(Submission)
    private readonly submissionRepository: Repository<Submission>,
    @InjectRepository(ActionDefinition)
    private readonly definitionRepository: Repository<ActionDefinition>,
    @InjectRepository(Participation)
    private readonly participationRepository: Repository<Participation>,
    @Inject(forwardRef(() => CampaignService))
    private readonly campaigns: CampaignService,
    @Inject(forwardRef(() => ParticipationService))
    private readonly participations: ParticipationService,
    @Inject(forwardRef(() => CommunityService))
    private readonly communities: CommunityService,
    @Inject(forwardRef(() => MeasurementDefinitionService))
    private readonly measurementDefinitions: MeasurementDefinitionService,
    @Inject(forwardRef(() => ImpactFactorService))
    private readonly impactFactors: ImpactFactorService,
  ) {}

  async getParticipantMeasurements(
    tenant: TenantContext,
    participationId: string,
  ): Promise<MeasurementSnapshot> {
    const { campaign, snapshot } = await this.requireParticipantSnapshot(
      tenant,
      participationId,
    );
    return {
      scope: 'participant',
      customerId: tenant.tenantId,
      campaignId: campaign.id,
      participationId: snapshot.participationId,
      userId: snapshot.userId,
      communityId: snapshot.communityId,
      timezone: campaign.timezone,
      measurements: snapshot.measurements,
    };
  }

  async getCampaignMeasurements(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<MeasurementSnapshot> {
    const { campaign, snapshots } = await this.loadCampaignSnapshots(
      tenant,
      campaignId,
    );
    return this.toAggregateMeasurement(
      tenant.tenantId,
      campaign,
      'campaign',
      null,
      snapshots,
    );
  }

  async getCommunityMeasurements(
    tenant: TenantContext,
    campaignId: string,
    communityId: string,
  ): Promise<MeasurementSnapshot> {
    const { campaign, snapshots } = await this.loadCommunitySnapshots(
      tenant,
      campaignId,
      communityId,
    );
    return this.toAggregateMeasurement(
      tenant.tenantId,
      campaign,
      'community',
      communityId,
      snapshots,
    );
  }

  async getParticipantOutcomes(
    tenant: TenantContext,
    participationId: string,
  ): Promise<OutcomeSnapshot> {
    const { campaign, snapshot } = await this.requireParticipantSnapshot(
      tenant,
      participationId,
    );
    return {
      scope: 'participant',
      customerId: tenant.tenantId,
      campaignId: campaign.id,
      participationId: snapshot.participationId,
      userId: snapshot.userId,
      communityId: snapshot.communityId,
      timezone: campaign.timezone,
      outcomes: snapshot.outcomes,
    };
  }

  async getCampaignOutcomes(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<OutcomeSnapshot> {
    const { campaign, snapshots } = await this.loadCampaignSnapshots(
      tenant,
      campaignId,
    );
    return this.toAggregateOutcome(
      tenant.tenantId,
      campaign,
      'campaign',
      null,
      snapshots,
    );
  }

  async getCommunityOutcomes(
    tenant: TenantContext,
    campaignId: string,
    communityId: string,
  ): Promise<OutcomeSnapshot> {
    const { campaign, snapshots } = await this.loadCommunitySnapshots(
      tenant,
      campaignId,
      communityId,
    );
    return this.toAggregateOutcome(
      tenant.tenantId,
      campaign,
      'community',
      communityId,
      snapshots,
    );
  }

  async getParticipantTimeSeries(
    tenant: TenantContext,
    participationId: string,
    granularity: TimeSeriesGranularity,
  ): Promise<TimeSeriesResult> {
    const { campaign, actions, definitions, factors } =
      await this.requireParticipantCompute(tenant, participationId);
    return computeTimeSeries(
      actions,
      definitions,
      factors,
      campaign.id,
      campaign.timezone,
      granularity,
    );
  }

  async getCampaignTimeSeries(
    tenant: TenantContext,
    campaignId: string,
    granularity: TimeSeriesGranularity,
  ): Promise<TimeSeriesResult> {
    const { campaign, actions, definitions, factors } =
      await this.loadCampaignCompute(tenant, campaignId);
    return computeTimeSeries(
      actions,
      definitions,
      factors,
      campaign.id,
      campaign.timezone,
      granularity,
    );
  }

  async getCommunityTimeSeries(
    tenant: TenantContext,
    campaignId: string,
    communityId: string,
    granularity: TimeSeriesGranularity,
  ): Promise<TimeSeriesResult> {
    const { campaign, actions, definitions, factors } =
      await this.loadCommunityCompute(tenant, campaignId, communityId);
    return computeTimeSeries(
      actions,
      definitions,
      factors,
      campaign.id,
      campaign.timezone,
      granularity,
    );
  }

  async computeParticipantBundle(
    tenant: TenantContext,
    participationId: string,
    granularity: TimeSeriesGranularity,
  ) {
    const { campaign, snapshot, timeSeries } =
      await this.requireParticipantSnapshot(
        tenant,
        participationId,
        granularity,
      );
    return { campaign, snapshot, timeSeries };
  }

  async computeCampaignBundle(
    tenant: TenantContext,
    campaignId: string,
    granularity: TimeSeriesGranularity,
  ) {
    const { campaign, snapshots, timeSeries } =
      await this.loadCampaignSnapshots(tenant, campaignId, granularity);
    return { campaign, snapshots, timeSeries };
  }

  async computeCommunityBundle(
    tenant: TenantContext,
    campaignId: string,
    communityId: string,
    granularity: TimeSeriesGranularity,
  ) {
    const { campaign, snapshots, timeSeries } =
      await this.loadCommunitySnapshots(
        tenant,
        campaignId,
        communityId,
        granularity,
      );
    return { campaign, snapshots, timeSeries };
  }

  private async requireParticipantSnapshot(
    tenant: TenantContext,
    participationId: string,
    granularity: TimeSeriesGranularity = 'day',
  ) {
    const participation = await this.participations.getParticipationRecord(
      tenant,
      participationId,
    );
    if (!this.canViewParticipant(tenant, participation.userId)) {
      throw new ResourceNotFoundException('Measurements not found');
    }
    const { campaign, actions, definitions, factors } =
      await this.loadCampaignCompute(tenant, participation.campaignId);
    const ownActions = actions.filter(
      (action) => action.participationId === participation.id,
    );
    const snapshot = {
      participationId: participation.id,
      userId: participation.userId,
      communityId: participation.communityId,
      measurements: computeMeasurements(ownActions, definitions),
      outcomes: computeOutcomes(ownActions, definitions, factors, campaign.id),
    };
    const timeSeries = computeTimeSeries(
      ownActions,
      definitions,
      factors,
      campaign.id,
      campaign.timezone,
      granularity,
    );
    return { campaign, snapshot, timeSeries };
  }

  private async requireParticipantCompute(
    tenant: TenantContext,
    participationId: string,
  ) {
    const participation = await this.participations.getParticipationRecord(
      tenant,
      participationId,
    );
    if (!this.canViewParticipant(tenant, participation.userId)) {
      throw new ResourceNotFoundException('Measurements not found');
    }
    const loaded = await this.loadCampaignCompute(
      tenant,
      participation.campaignId,
    );
    return {
      ...loaded,
      actions: loaded.actions.filter(
        (action) => action.participationId === participation.id,
      ),
    };
  }

  private async loadCommunitySnapshots(
    tenant: TenantContext,
    campaignId: string,
    communityId: string,
    granularity: TimeSeriesGranularity = 'day',
  ) {
    await this.communities.get(tenant, communityId);
    const descendantIds = await this.communities.listDescendantIds(communityId);
    const subtree = new Set([communityId, ...descendantIds]);
    const loaded = await this.loadCampaignSnapshots(
      tenant,
      campaignId,
      granularity,
    );
    const snapshots = loaded.snapshots.filter(
      (snapshot) =>
        snapshot.communityId != null && subtree.has(snapshot.communityId),
    );
    const actions = loaded.actions.filter(
      (action) => action.communityId != null && subtree.has(action.communityId),
    );
    const timeSeries = computeTimeSeries(
      actions,
      loaded.definitions,
      loaded.factors,
      loaded.campaign.id,
      loaded.campaign.timezone,
      granularity,
    );
    return { ...loaded, snapshots, timeSeries };
  }

  private async loadCommunityCompute(
    tenant: TenantContext,
    campaignId: string,
    communityId: string,
  ) {
    await this.communities.get(tenant, communityId);
    const descendantIds = await this.communities.listDescendantIds(communityId);
    const subtree = new Set([communityId, ...descendantIds]);
    const loaded = await this.loadCampaignCompute(tenant, campaignId);
    return {
      ...loaded,
      actions: loaded.actions.filter(
        (action) =>
          action.communityId != null && subtree.has(action.communityId),
      ),
    };
  }

  private async loadCampaignSnapshots(
    tenant: TenantContext,
    campaignId: string,
    granularity: TimeSeriesGranularity = 'day',
  ) {
    const { campaign, actions, definitions, factors, participations } =
      await this.loadCampaignCompute(tenant, campaignId);
    const snapshots = participations.map((participation) => {
      const ownActions = actions.filter(
        (action) => action.participationId === participation.id,
      );
      return {
        participationId: participation.id,
        userId: participation.userId,
        communityId: participation.communityId,
        measurements: computeMeasurements(ownActions, definitions),
        outcomes: computeOutcomes(
          ownActions,
          definitions,
          factors,
          campaign.id,
        ),
      };
    });
    const timeSeries = computeTimeSeries(
      actions,
      definitions,
      factors,
      campaign.id,
      campaign.timezone,
      granularity,
    );
    return { campaign, snapshots, timeSeries, actions, definitions, factors };
  }

  private async loadCampaignCompute(tenant: TenantContext, campaignId: string) {
    const campaign = await this.campaigns.getCampaignRecord(tenant, campaignId);
    const [
      participations,
      actions,
      submissions,
      actionDefinitions,
      definitions,
      factors,
    ] = await Promise.all([
      this.participationRepository.find({
        where: { tenant_id: tenant.tenantId, campaign_id: campaign.id },
      }),
      this.actionRepository.find({
        where: {
          tenant_id: tenant.tenantId,
          campaign_id: campaign.id,
          status: ActionStatus.RECORDED,
        },
      }),
      this.submissionRepository.find({
        where: {
          tenant_id: tenant.tenantId,
          status: SubmissionStatus.APPROVED,
        },
      }),
      this.definitionRepository.find({
        where: { tenant_id: tenant.tenantId, campaign_id: campaign.id },
      }),
      this.measurementDefinitions.listActiveRows(tenant.tenantId, campaign.id),
      this.impactFactors.listApplicableRows(tenant.tenantId, campaign.id),
    ]);

    const approvedActionIds = new Set(
      submissions
        .filter((row) => actions.some((action) => action.id === row.action_id))
        .map((row) => row.action_id),
    );
    const definitionById = new Map(
      actionDefinitions.map((definition) => [definition.id, definition]),
    );
    const participationById = new Map(
      participations.map((row) => [row.id, row]),
    );
    const approvedActions: ApprovedActionRow[] = actions
      .filter((action) => approvedActionIds.has(action.id))
      .map((action) => {
        const definition = definitionById.get(action.action_definition_id);
        const participation = participationById.get(action.participation_id);
        return {
          participationId: action.participation_id,
          userId: action.user_id,
          communityId: participation?.community_id ?? null,
          sourceUnit: definition?.unit ?? '',
          quantity: action.quantity,
          occurredOn: toIsoDate(action.occurred_on) ?? action.occurred_on,
        };
      })
      .filter((action) => action.sourceUnit.length > 0 && action.quantity > 0);

    const definitionRows: MeasurementDefinitionRow[] = definitions.map(
      (row) => ({
        id: row.id,
        key: row.key,
        sourceUnit: row.source_unit,
        isActive: row.is_active,
      }),
    );
    const factorRows: ImpactFactorRow[] = factors.map((row) => ({
      id: row.id,
      campaignId: row.campaign_id,
      sourceUnit: row.source_unit,
      outcomeMetric: row.outcome_metric,
      outcomeUnit: row.outcome_unit,
      factorValue: row.factor_value,
      version: row.version,
      source: row.source,
      effectiveFrom: toIsoDate(row.effective_from) ?? row.effective_from,
      effectiveTo:
        row.effective_to == null
          ? null
          : (toIsoDate(row.effective_to) ?? row.effective_to),
      isActive: row.is_active,
    }));

    return {
      campaign,
      actions: approvedActions,
      definitions: definitionRows,
      factors: factorRows,
      participations: participations.map((row) => ({
        id: row.id,
        userId: row.user_id,
        communityId: row.community_id,
      })),
    };
  }

  private toAggregateMeasurement(
    tenantId: string,
    campaign: { id: string; timezone: string },
    scope: 'campaign' | 'community',
    communityId: string | null,
    snapshots: Array<{ measurements: MeasurementTotal[] }>,
  ): MeasurementSnapshot {
    return {
      scope,
      customerId: tenantId,
      campaignId: campaign.id,
      participationId: null,
      userId: null,
      communityId,
      timezone: campaign.timezone,
      measurements: mergeMeasurements(
        snapshots.flatMap((row) => row.measurements),
      ),
    };
  }

  private toAggregateOutcome(
    tenantId: string,
    campaign: { id: string; timezone: string },
    scope: 'campaign' | 'community',
    communityId: string | null,
    snapshots: Array<{ outcomes: OutcomeTotal[] }>,
  ): OutcomeSnapshot {
    return {
      scope,
      customerId: tenantId,
      campaignId: campaign.id,
      participationId: null,
      userId: null,
      communityId,
      timezone: campaign.timezone,
      outcomes: mergeOutcomes(snapshots.flatMap((row) => row.outcomes)),
    };
  }

  private canViewParticipant(
    tenant: TenantContext,
    ownerUserId: string,
  ): boolean {
    if (
      tenant.permissions.has(PERMISSIONS.ACTIONS_UPDATE) ||
      tenant.permissions.has(PERMISSIONS.PARTICIPATIONS_UPDATE)
    ) {
      return true;
    }
    return tenant.memberships.some(
      (membership) => membership.isActive && membership.userId === ownerUserId,
    );
  }
}

function mergeMeasurements(rows: MeasurementTotal[]): MeasurementTotal[] {
  const byUnit = new Map<string, MeasurementTotal>();
  for (const row of rows) {
    const current = byUnit.get(row.sourceUnit);
    if (!current) {
      byUnit.set(row.sourceUnit, { ...row });
      continue;
    }
    current.quantity += row.quantity;
    current.approvedActionCount += row.approvedActionCount;
    current.distinctApprovedDays += row.distinctApprovedDays;
  }
  return [...byUnit.values()].sort((left, right) =>
    left.sourceUnit.localeCompare(right.sourceUnit),
  );
}

function mergeOutcomes(rows: OutcomeTotal[]): OutcomeTotal[] {
  const byKey = new Map<string, OutcomeTotal>();
  for (const row of rows) {
    const key = `${row.sourceUnit}\u0000${row.outcomeMetric}`;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, {
        ...row,
        contributions: row.contributions.map((item) => ({ ...item })),
      });
      continue;
    }
    current.value = Number((current.value + row.value).toFixed(8));
    current.sourceQuantity += row.sourceQuantity;
    for (const contribution of row.contributions) {
      const existing = current.contributions.find(
        (item) => item.impactFactorId === contribution.impactFactorId,
      );
      if (existing) {
        existing.sourceQuantity += contribution.sourceQuantity;
        existing.value = Number(
          (existing.value + contribution.value).toFixed(8),
        );
      } else {
        current.contributions.push({ ...contribution });
      }
    }
  }
  return [...byKey.values()].sort((left, right) => {
    const unit = left.sourceUnit.localeCompare(right.sourceUnit);
    return unit !== 0
      ? unit
      : left.outcomeMetric.localeCompare(right.outcomeMetric);
  });
}
