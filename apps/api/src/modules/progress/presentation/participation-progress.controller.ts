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

@Controller('participations/:participationId')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class ParticipationProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get('progress')
  @RequirePermission(PERMISSIONS.PROGRESS_READ)
  getProgress(
    @CurrentTenant() tenant: TenantContext,
    @Param('participationId', ParseUUIDPipe) participationId: string,
  ) {
    return this.progress.getParticipantProgress(tenant, participationId);
  }

  @Get('achievement')
  @RequirePermission(PERMISSIONS.ACHIEVEMENTS_READ)
  getAchievement(
    @CurrentTenant() tenant: TenantContext,
    @Param('participationId', ParseUUIDPipe) participationId: string,
  ) {
    return this.progress.getParticipantAchievement(tenant, participationId);
  }
}
