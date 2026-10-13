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

@Controller('participations/:participationId')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class ParticipationOutcomesController {
  constructor(private readonly outcomes: OutcomeService) {}

  @Get('measurements')
  @RequirePermission(PERMISSIONS.MEASUREMENTS_READ)
  getMeasurements(
    @CurrentTenant() tenant: TenantContext,
    @Param('participationId', ParseUUIDPipe) participationId: string,
  ) {
    return this.outcomes.getParticipantMeasurements(tenant, participationId);
  }

  @Get('outcomes')
  @RequirePermission(PERMISSIONS.OUTCOMES_READ)
  getOutcomes(
    @CurrentTenant() tenant: TenantContext,
    @Param('participationId', ParseUUIDPipe) participationId: string,
  ) {
    return this.outcomes.getParticipantOutcomes(tenant, participationId);
  }
}
