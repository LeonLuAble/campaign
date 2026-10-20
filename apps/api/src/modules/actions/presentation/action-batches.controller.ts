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
import { ReviewSubmissionDto } from '../dto/update-action.dto.js';

@Controller('action-batches')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class ActionBatchesController {
  constructor(private readonly batches: ActionBatchService) {}

  @Get(':actionBatchId')
  @RequirePermission(PERMISSIONS.ACTIONS_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('actionBatchId', ParseUUIDPipe) actionBatchId: string,
  ) {
    return this.batches.get(tenant, actionBatchId);
  }

  @Post(':actionBatchId/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('actionBatchId', ParseUUIDPipe) actionBatchId: string,
  ) {
    return this.batches.cancel(tenant, actionBatchId, user.userId);
  }

  @Post(':actionBatchId/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.SUBMISSIONS_UPDATE)
  approve(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('actionBatchId', ParseUUIDPipe) actionBatchId: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.batches.approve(tenant, actionBatchId, user.userId, dto?.note);
  }

  @Post(':actionBatchId/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.SUBMISSIONS_UPDATE)
  reject(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('actionBatchId', ParseUUIDPipe) actionBatchId: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.batches.reject(tenant, actionBatchId, user.userId, dto?.note);
  }
}
