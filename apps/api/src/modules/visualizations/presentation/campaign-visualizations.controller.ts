import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
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
import { DashboardService } from '../application/dashboard.service.js';
import { VisualizationService } from '../application/visualization.service.js';
import { DashboardQueryDto } from '../dto/dashboard-query.dto.js';
import { ReplaceVisualizationDto } from '../dto/replace-visualization.dto.js';

@Controller('campaigns/:campaignId')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CampaignVisualizationsController {
  constructor(
    private readonly visualizations: VisualizationService,
    private readonly dashboards: DashboardService,
  ) {}

  @Get('visualization')
  @RequirePermission(PERMISSIONS.VISUALIZATIONS_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.visualizations.get(tenant, campaignId);
  }

  @Put('visualization')
  @RequirePermission(PERMISSIONS.VISUALIZATIONS_UPDATE)
  replace(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: ReplaceVisualizationDto,
  ) {
    return this.visualizations.replace(tenant, campaignId, user.userId, dto);
  }

  @Get('visualization/data')
  @RequirePermission(PERMISSIONS.VISUALIZATIONS_READ)
  getData(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.visualizations.getData(tenant, campaignId);
  }

  @Get('dashboard')
  @RequirePermission(PERMISSIONS.DASHBOARDS_READ)
  getCampaignDashboard(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboards.getCampaignDashboard(
      tenant,
      campaignId,
      query.granularity ?? 'day',
    );
  }

  @Get('communities/:communityId/dashboard')
  @RequirePermission(PERMISSIONS.DASHBOARDS_READ)
  getCommunityDashboard(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboards.getCommunityDashboard(
      tenant,
      campaignId,
      communityId,
      query.granularity ?? 'day',
    );
  }
}
