import {
  Body,
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
import { ActionBatchService } from '../application/action-batch.service.js';
import { CreateActionRangeDto } from '../dto/create-action-range.dto.js';

@Controller('participations/:participationId')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class ParticipationActionBatchesController {
  constructor(private readonly batches: ActionBatchService) {}

  @Post('action-ranges')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.ACTIONS_CREATE)
  recordRange(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('participationId', ParseUUIDPipe) participationId: string,
    @Body() dto: CreateActionRangeDto,
  ) {
    return this.batches.recordRange(tenant, user.userId, participationId, dto);
  }

  @Get('action-batches')
  @RequirePermission(PERMISSIONS.ACTIONS_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Param('participationId', ParseUUIDPipe) participationId: string,
  ) {
    return this.batches.listForParticipation(tenant, participationId);
  }
}
