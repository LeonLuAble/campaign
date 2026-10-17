import { Inject, Injectable, forwardRef } from '@nestjs/common';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import type {
  AggregateProgressResponse,
  ParticipantProgressResponse,
} from '../../progress/application/progress.service.js';
import { ProgressService } from '../../progress/application/progress.service.js';
import {
  type MeasurementTotal,
  type OutcomeTotal,
  type TimeSeriesGranularity,
  type TimeSeriesResult,
} from '../../outcomes/application/outcome-math.js';
import { OutcomeService } from '../../outcomes/application/outcome.service.js';
import {
  VisualizationService,
  type VisualizationDataResponse,
} from './visualization.service.js';

export interface ParticipantDashboardResponse {
  scope: 'participant';
  customerId: string;
  campaignId: string;
  participationId: string;
  userId: string;
  communityId: string | null;
  timezone: string;
  progress: ParticipantProgressResponse;
  measurements: MeasurementTotal[];
  outcomes: OutcomeTotal[];
  timeSeries: TimeSeriesResult;
  visualization: VisualizationDataResponse;
}

export interface AggregateDashboardResponse {
  scope: 'campaign' | 'community';
  customerId: string;
  campaignId: string;
  communityId: string | null;
  timezone: string;
  progress: AggregateProgressResponse;
  measurements: MeasurementTotal[];
  outcomes: OutcomeTotal[];
  timeSeries: TimeSeriesResult;
  visualization: VisualizationDataResponse;
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(forwardRef(() => ProgressService))
    private readonly progress: ProgressService,
    @Inject(forwardRef(() => OutcomeService))
    private readonly outcomes: OutcomeService,
    @Inject(forwardRef(() => VisualizationService))
    private readonly visualizations: VisualizationService,
  ) {}

  async getParticipantDashboard(
    tenant: TenantContext,
    participationId: string,
    granularity: TimeSeriesGranularity = 'day',
  ): Promise<ParticipantDashboardResponse> {
    const progress = await this.progress.getParticipantProgress(
      tenant,
      participationId,
    );
    const bundle = await this.outcomes.computeParticipantBundle(
      tenant,
      participationId,
      granularity,
    );
    const visualizationRow = await this.visualizations.findForCampaign(
      tenant.tenantId,
      progress.campaignId,
    );
    const campaignProgress = await this.progress.getCampaignProgress(
      tenant,
      progress.campaignId,
    );
    return {
      scope: 'participant',
      customerId: progress.customerId,
      campaignId: progress.campaignId,
      participationId: progress.participationId,
      userId: progress.userId,
      communityId: progress.communityId,
      timezone: progress.timezone,
      progress,
      measurements: bundle.snapshot.measurements,
      outcomes: bundle.snapshot.outcomes,
      timeSeries: bundle.timeSeries,
      visualization: await this.visualizations.toData(
        bundle.campaign,
        visualizationRow,
        campaignProgress,
        tenant.tenantId,
      ),
    };
  }

  async getCampaignDashboard(
    tenant: TenantContext,
    campaignId: string,
    granularity: TimeSeriesGranularity = 'day',
  ): Promise<AggregateDashboardResponse> {
    const progress = await this.progress.getCampaignProgress(
      tenant,
      campaignId,
    );
    const bundle = await this.outcomes.computeCampaignBundle(
      tenant,
      campaignId,
      granularity,
    );
    const visualizationRow = await this.visualizations.findForCampaign(
      tenant.tenantId,
      campaignId,
    );
    return this.toAggregateDashboard(
      tenant.tenantId,
      'campaign',
      null,
      progress,
      bundle,
      visualizationRow,
      progress,
    );
  }

  async getCommunityDashboard(
    tenant: TenantContext,
    campaignId: string,
    communityId: string,
    granularity: TimeSeriesGranularity = 'day',
  ): Promise<AggregateDashboardResponse> {
    const progress = await this.progress.getCommunityProgress(
      tenant,
      campaignId,
      communityId,
    );
    const bundle = await this.outcomes.computeCommunityBundle(
      tenant,
      campaignId,
      communityId,
      granularity,
    );
    const visualizationRow = await this.visualizations.findForCampaign(
      tenant.tenantId,
      campaignId,
    );
    const campaignProgress = await this.progress.getCampaignProgress(
      tenant,
      campaignId,
    );
    return this.toAggregateDashboard(
      tenant.tenantId,
      'community',
      communityId,
      progress,
      bundle,
      visualizationRow,
      campaignProgress,
    );
  }

  private async toAggregateDashboard(
    tenantId: string,
    scope: 'campaign' | 'community',
    communityId: string | null,
    progress: AggregateProgressResponse,
    bundle: Awaited<ReturnType<OutcomeService['computeCampaignBundle']>>,
    visualizationRow: Awaited<
      ReturnType<VisualizationService['findForCampaign']>
    >,
    visualizationProgress: AggregateProgressResponse,
  ): Promise<AggregateDashboardResponse> {
    const measurements = mergeFromSnapshots(
      bundle.snapshots.map((row) => row.measurements),
    );
    const outcomes = mergeOutcomeSnapshots(
      bundle.snapshots.map((row) => row.outcomes),
    );
    return {
      scope,
      customerId: tenantId,
      campaignId: progress.campaignId,
      communityId,
      timezone: progress.timezone,
      progress,
      measurements,
      outcomes,
      timeSeries: bundle.timeSeries,
      visualization: await this.visualizations.toData(
        bundle.campaign,
        visualizationRow,
        visualizationProgress,
        tenantId,
      ),
    };
  }
}

function mergeFromSnapshots(groups: MeasurementTotal[][]): MeasurementTotal[] {
  const byUnit = new Map<string, MeasurementTotal>();
  for (const rows of groups) {
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
  }
  return [...byUnit.values()].sort((left, right) =>
    left.sourceUnit.localeCompare(right.sourceUnit),
  );
}

function mergeOutcomeSnapshots(groups: OutcomeTotal[][]): OutcomeTotal[] {
  const byKey = new Map<string, OutcomeTotal>();
  for (const rows of groups) {
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
  }
  return [...byKey.values()].sort((left, right) => {
    const unit = left.sourceUnit.localeCompare(right.sourceUnit);
    return unit !== 0
      ? unit
      : left.outcomeMetric.localeCompare(right.outcomeMetric);
  });
}
