import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CurrentTenant } from '../../authorization/presentation/current-tenant.decorator.js';
import { PermissionsGuard } from '../../authorization/presentation/permissions.guard.js';
import { RequirePermission } from '../../authorization/presentation/require-permission.decorator.js';
import { TenantScopeGuard } from '../../authorization/presentation/tenant-scope.guard.js';
import { ProgressService } from '../application/progress.service.js';

@Controller('campaigns/:campaignId')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CampaignProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get('progress')
  @RequirePermission(PERMISSIONS.PROGRESS_READ)
  getCampaignProgress(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.progress.getCampaignProgress(tenant, campaignId);
  }

  @Get('achievements')
  @RequirePermission(PERMISSIONS.ACHIEVEMENTS_READ)
  listAchievements(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.progress.listCampaignAchievements(tenant, campaignId);
  }

  @Get('communities/:communityId/progress')
  @RequirePermission(PERMISSIONS.PROGRESS_READ)
  getCommunityProgress(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    return this.progress.getCommunityProgress(tenant, campaignId, communityId);
  }
}
