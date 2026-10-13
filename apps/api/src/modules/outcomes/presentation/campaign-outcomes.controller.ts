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
import { OutcomeService } from '../application/outcome.service.js';

@Controller('campaigns/:campaignId')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CampaignOutcomesController {
  constructor(private readonly outcomes: OutcomeService) {}

  @Get('measurements')
  @RequirePermission(PERMISSIONS.MEASUREMENTS_READ)
  getCampaignMeasurements(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.outcomes.getCampaignMeasurements(tenant, campaignId);
  }

  @Get('outcomes')
  @RequirePermission(PERMISSIONS.OUTCOMES_READ)
  getCampaignOutcomes(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.outcomes.getCampaignOutcomes(tenant, campaignId);
  }

  @Get('communities/:communityId/measurements')
  @RequirePermission(PERMISSIONS.MEASUREMENTS_READ)
  getCommunityMeasurements(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    return this.outcomes.getCommunityMeasurements(
      tenant,
      campaignId,
      communityId,
    );
  }

  @Get('communities/:communityId/outcomes')
  @RequirePermission(PERMISSIONS.OUTCOMES_READ)
  getCommunityOutcomes(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    return this.outcomes.getCommunityOutcomes(tenant, campaignId, communityId);
  }
}
