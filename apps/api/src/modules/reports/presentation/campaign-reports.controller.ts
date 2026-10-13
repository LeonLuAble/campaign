import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../auth/presentation/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CurrentTenant } from '../../authorization/presentation/current-tenant.decorator.js';
import { PermissionsGuard } from '../../authorization/presentation/permissions.guard.js';
import { RequirePermission } from '../../authorization/presentation/require-permission.decorator.js';
import { TenantScopeGuard } from '../../authorization/presentation/tenant-scope.guard.js';
import { ReportService } from '../application/report.service.js';

@Controller('campaigns/:campaignId')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CampaignReportsController {
  constructor(private readonly reports: ReportService) {}

  @Get('report')
  @RequirePermission(PERMISSIONS.REPORTS_READ)
  getCampaignReport(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.reports.getCampaignReport(tenant, campaignId);
  }

  @Get('report/export')
  @RequirePermission(PERMISSIONS.REPORTS_EXPORT)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="campaign-report.csv"')
  exportCampaignReport(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.reports.exportCampaignCsv(tenant, campaignId, user.userId);
  }

  @Get('communities/:communityId/report')
  @RequirePermission(PERMISSIONS.REPORTS_READ)
  getCommunityReport(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    return this.reports.getCommunityReport(tenant, campaignId, communityId);
  }

  @Get('communities/:communityId/report/export')
  @RequirePermission(PERMISSIONS.REPORTS_EXPORT)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="community-report.csv"')
  exportCommunityReport(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    return this.reports.exportCommunityCsv(
      tenant,
      campaignId,
      communityId,
      user.userId,
    );
  }
}
