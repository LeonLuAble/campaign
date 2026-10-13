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
import { DashboardService } from '../application/dashboard.service.js';
import { DashboardQueryDto } from '../dto/dashboard-query.dto.js';

@Controller('participations/:participationId')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class ParticipationDashboardsController {
  constructor(private readonly dashboards: DashboardService) {}

  @Get('dashboard')
  @RequirePermission(PERMISSIONS.DASHBOARDS_READ)
  getDashboard(
    @CurrentTenant() tenant: TenantContext,
    @Param('participationId', ParseUUIDPipe) participationId: string,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboards.getParticipantDashboard(
      tenant,
      participationId,
      query.granularity ?? 'day',
    );
  }
}
