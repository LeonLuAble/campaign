import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { ParticipationService } from '../application/participation.service.js';

@Controller('participations')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class ParticipationsController {
  constructor(private readonly participations: ParticipationService) {}

  @Get(':participationId')
  @RequirePermission(PERMISSIONS.PARTICIPATIONS_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('participationId', ParseUUIDPipe) participationId: string,
  ) {
    return this.participations.get(tenant, participationId);
  }

  @Post(':participationId/withdraw')
  @HttpCode(HttpStatus.OK)
  withdraw(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('participationId', ParseUUIDPipe) participationId: string,
  ) {
    return this.participations.withdraw(tenant, participationId, user.userId);
  }
}
