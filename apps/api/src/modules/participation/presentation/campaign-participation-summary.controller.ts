import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CurrentTenant } from '../../authorization/presentation/current-tenant.decorator.js';
import { PermissionsGuard } from '../../authorization/presentation/permissions.guard.js';
import { RequirePermission } from '../../authorization/presentation/require-permission.decorator.js';
import { TenantScopeGuard } from '../../authorization/presentation/tenant-scope.guard.js';
import { ParticipationService } from '../application/participation.service.js';
import { ParticipationSummaryQueryDto } from '../dto/participation-summary-query.dto.js';

@Controller('campaigns/:campaignId/participation-summary')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CampaignParticipationSummaryController {
  constructor(private readonly participations: ParticipationService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PROGRESS_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Query() query: ParticipationSummaryQueryDto,
  ) {
    return this.participations.getParticipationSummary(
      tenant,
      campaignId,
      query.communityId,
    );
  }
}
