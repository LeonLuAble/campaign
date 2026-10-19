import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { AccessForbiddenException } from '../../../shared/errors/domain-http.exceptions.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { DashboardService } from '../../visualizations/application/dashboard.service.js';
import {
  emptyReportCsvRow,
  serializeCsv,
  type ReportCsvRow,
} from './report-csv.js';

export interface ParticipantReportResponse {
  scope: 'participant';
  customerId: string;
  campaignId: string;
  participationId: string;
  userId: string;
  communityId: string | null;
  timezone: string;
  generatedAt: string;
  progress: {
    units: Array<{
      unit: string;
      achievedValue: number;
      targetValue: number;
      completionPercent: number | null;
      completionStatus: string;
    }>;
  };
  measurements: Array<{
    sourceUnit: string;
    quantity: number;
  }>;
  outcomes: Array<{
    sourceUnit: string;
    outcomeMetric: string;
    outcomeUnit: string;
    value: number;
  }>;
}

export interface AggregateReportResponse {
  scope: 'campaign' | 'community';
  customerId: string;
  campaignId: string;
  communityId: string | null;
  timezone: string;
  generatedAt: string;
  progress: {
    participantCount: number;
    committedParticipantCount: number;
    notTakingPartCount: number;
    awaitingCommitmentCount: number;
    units: Array<{
      unit: string;
      achievedValue: number;
      targetValue: number;
      completionPercent: number | null;
      completionStatus: string;
    }>;
  };
  measurements: Array<{
    sourceUnit: string;
    quantity: number;
  }>;
  outcomes: Array<{
    sourceUnit: string;
    outcomeMetric: string;
    outcomeUnit: string;
    value: number;
  }>;
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @Inject(forwardRef(() => DashboardService))
    private readonly dashboards: DashboardService,
  ) {}

  async getParticipantReport(
    tenant: TenantContext,
    participationId: string,
  ): Promise<ParticipantReportResponse> {
    const dashboard = await this.dashboards.getParticipantDashboard(
      tenant,
      participationId,
    );
    return {
      scope: 'participant',
      customerId: dashboard.customerId,
      campaignId: dashboard.campaignId,
      participationId: dashboard.participationId,
      userId: dashboard.userId,
      communityId: dashboard.communityId,
      timezone: dashboard.timezone,
      generatedAt: new Date().toISOString(),
      progress: {
        units: dashboard.progress.byUnit.map((unit) => ({
          unit: unit.unit,
          achievedValue: unit.achievedValue,
          targetValue: unit.targetValue,
          completionPercent: unit.completionPercent,
          completionStatus: unit.completionStatus,
        })),
      },
      measurements: dashboard.measurements.map((row) => ({
        sourceUnit: row.sourceUnit,
        quantity: row.quantity,
      })),
      outcomes: dashboard.outcomes.map((row) => ({
        sourceUnit: row.sourceUnit,
        outcomeMetric: row.outcomeMetric,
        outcomeUnit: row.outcomeUnit,
        value: row.value,
      })),
    };
  }

  async getCampaignReport(
    tenant: TenantContext,
    campaignId: string,
  ): Promise<AggregateReportResponse> {
    const dashboard = await this.dashboards.getCampaignDashboard(
      tenant,
      campaignId,
    );
    return this.toAggregate(dashboard);
  }

  async getCommunityReport(
    tenant: TenantContext,
    campaignId: string,
    communityId: string,
  ): Promise<AggregateReportResponse> {
    const dashboard = await this.dashboards.getCommunityDashboard(
      tenant,
      campaignId,
      communityId,
    );
    return this.toAggregate(dashboard);
  }

  async exportParticipantCsv(
    tenant: TenantContext,
    participationId: string,
    actorUserId: string,
  ): Promise<string> {
    this.assertCanExport(tenant);
    const report = await this.getParticipantReport(tenant, participationId);
    this.auditExport(tenant, actorUserId, report);
    return serializeCsv(this.flattenParticipant(report));
  }

  async exportCampaignCsv(
    tenant: TenantContext,
    campaignId: string,
    actorUserId: string,
  ): Promise<string> {
    this.assertCanExport(tenant);
    const report = await this.getCampaignReport(tenant, campaignId);
    this.auditExport(tenant, actorUserId, report);
    return serializeCsv(this.flattenAggregate(report));
  }

  async exportCommunityCsv(
    tenant: TenantContext,
    campaignId: string,
    communityId: string,
    actorUserId: string,
  ): Promise<string> {
    this.assertCanExport(tenant);
    const report = await this.getCommunityReport(
      tenant,
      campaignId,
      communityId,
    );
    this.auditExport(tenant, actorUserId, report);
    return serializeCsv(this.flattenAggregate(report));
  }

  private toAggregate(
    dashboard: Awaited<ReturnType<DashboardService['getCampaignDashboard']>>,
  ): AggregateReportResponse {
    return {
      scope: dashboard.scope,
      customerId: dashboard.customerId,
      campaignId: dashboard.campaignId,
      communityId: dashboard.communityId,
      timezone: dashboard.timezone,
      generatedAt: new Date().toISOString(),
      progress: {
        participantCount: dashboard.progress.participantCount,
        committedParticipantCount:
          dashboard.progress.committedParticipantCount,
        notTakingPartCount: dashboard.progress.notTakingPartCount,
        awaitingCommitmentCount: dashboard.progress.awaitingCommitmentCount,
        units: dashboard.progress.units.map((unit) => ({
          unit: unit.unit,
          achievedValue: unit.achievedValue,
          targetValue: unit.targetValue,
          completionPercent: unit.completionPercent,
          completionStatus: unit.completionStatus,
        })),
      },
      measurements: dashboard.measurements.map((row) => ({
        sourceUnit: row.sourceUnit,
        quantity: row.quantity,
      })),
      outcomes: dashboard.outcomes.map((row) => ({
        sourceUnit: row.sourceUnit,
        outcomeMetric: row.outcomeMetric,
        outcomeUnit: row.outcomeUnit,
        value: row.value,
      })),
    };
  }

  private flattenParticipant(report: ParticipantReportResponse): ReportCsvRow[] {
    const base = emptyReportCsvRow({
      scope: report.scope,
      customerId: report.customerId,
      campaignId: report.campaignId,
      communityId: report.communityId ?? '',
      participationId: report.participationId,
      userId: report.userId,
      timezone: report.timezone,
      generatedAt: report.generatedAt,
    });
    return this.flattenRows(base, report);
  }

  private flattenAggregate(report: AggregateReportResponse): ReportCsvRow[] {
    const base = emptyReportCsvRow({
      scope: report.scope,
      customerId: report.customerId,
      campaignId: report.campaignId,
      communityId: report.communityId ?? '',
      timezone: report.timezone,
      generatedAt: report.generatedAt,
      participantCount: String(report.progress.participantCount),
      committedParticipantCount: String(
        report.progress.committedParticipantCount,
      ),
      notTakingPartCount: String(report.progress.notTakingPartCount),
      awaitingCommitmentCount: String(
        report.progress.awaitingCommitmentCount,
      ),
    });
    return this.flattenRows(base, report);
  }

  private flattenRows(
    base: ReportCsvRow,
    report: ParticipantReportResponse | AggregateReportResponse,
  ): ReportCsvRow[] {
    const rows: ReportCsvRow[] = [];
    for (const unit of report.progress.units) {
      rows.push({
        ...base,
        rowType: 'progress',
        unit: unit.unit,
        achievedValue: String(unit.achievedValue),
        targetValue: String(unit.targetValue),
        completionPercent:
          unit.completionPercent == null ? '' : String(unit.completionPercent),
        completionStatus: unit.completionStatus,
      });
    }
    for (const measurement of report.measurements) {
      rows.push({
        ...base,
        rowType: 'measurement',
        sourceUnit: measurement.sourceUnit,
        quantity: String(measurement.quantity),
      });
    }
    for (const outcome of report.outcomes) {
      rows.push({
        ...base,
        rowType: 'outcome',
        sourceUnit: outcome.sourceUnit,
        outcomeMetric: outcome.outcomeMetric,
        outcomeValue: String(outcome.value),
        outcomeUnit: outcome.outcomeUnit,
      });
    }
    if (rows.length === 0) {
      rows.push({ ...base, rowType: 'summary' });
    }
    return rows;
  }

  private assertCanExport(tenant: TenantContext): void {
    if (!tenant.permissions.has(PERMISSIONS.REPORTS_EXPORT)) {
      throw new AccessForbiddenException(
        'Exporting reports requires reports.export',
      );
    }
  }

  private auditExport(
    tenant: TenantContext,
    actorUserId: string,
    report: ParticipantReportResponse | AggregateReportResponse,
  ): void {
    this.logger.log({
      msg: 'report_exported',
      tenantId: tenant.tenantId,
      actorUserId,
      scope: report.scope,
      campaignId: report.campaignId,
      communityId: report.communityId,
      participationId:
        report.scope === 'participant' ? report.participationId : null,
    });
  }
}
