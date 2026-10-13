import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { ActionService } from '../application/action.service.js';
import { CreateActionDto } from '../dto/create-action.dto.js';
import { UpdateActionDto } from '../dto/update-action.dto.js';

@Controller('actions')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class ActionsController {
  constructor(private readonly actions: ActionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.ACTIONS_CREATE)
  record(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateActionDto,
  ) {
    return this.actions.record(tenant, user.userId, dto);
  }

  @Get(':actionId')
  @RequirePermission(PERMISSIONS.ACTIONS_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('actionId', ParseUUIDPipe) actionId: string,
  ) {
    return this.actions.get(tenant, actionId);
  }

  @Patch(':actionId')
  @RequirePermission(PERMISSIONS.ACTIONS_UPDATE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('actionId', ParseUUIDPipe) actionId: string,
    @Body() dto: UpdateActionDto,
  ) {
    return this.actions.update(tenant, actionId, user.userId, dto);
  }

  @Post(':actionId/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('actionId', ParseUUIDPipe) actionId: string,
  ) {
    return this.actions.cancel(tenant, actionId, user.userId);
  }

  @Get(':actionId/submissions')
  @RequirePermission(PERMISSIONS.SUBMISSIONS_READ)
  listSubmissions(
    @CurrentTenant() tenant: TenantContext,
    @Param('actionId', ParseUUIDPipe) actionId: string,
  ) {
    return this.actions.listSubmissions(tenant, actionId);
  }
}
