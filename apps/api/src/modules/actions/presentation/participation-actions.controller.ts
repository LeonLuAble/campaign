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
import { ActionService } from '../application/action.service.js';

@Controller('participations/:participationId/actions')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class ParticipationActionsController {
  constructor(private readonly actions: ActionService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ACTIONS_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Param('participationId', ParseUUIDPipe) participationId: string,
  ) {
    return this.actions.listForParticipation(tenant, participationId);
  }
}
