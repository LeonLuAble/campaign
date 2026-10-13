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
import { MilestoneService } from '../application/milestone.service.js';
import { UpdateMilestoneDto } from '../dto/update-milestone.dto.js';

@Controller('milestones')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class MilestonesController {
  constructor(private readonly milestones: MilestoneService) {}

  @Get(':milestoneId')
  @RequirePermission(PERMISSIONS.MILESTONES_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
  ) {
    return this.milestones.get(tenant, milestoneId);
  }

  @Patch(':milestoneId')
  @RequirePermission(PERMISSIONS.MILESTONES_UPDATE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestones.update(tenant, milestoneId, dto);
  }

  @Get(':milestoneId/progress')
  @RequirePermission(PERMISSIONS.MILESTONES_READ)
  getProgress(
    @CurrentTenant() tenant: TenantContext,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
  ) {
    return this.milestones.getProgress(tenant, milestoneId);
  }

  @Post(':milestoneId/evaluate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.MILESTONES_EVALUATE)
  evaluate(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
  ) {
    return this.milestones.evaluate(tenant, milestoneId, user.userId);
  }

  @Get(':milestoneId/evaluations')
  @RequirePermission(PERMISSIONS.MILESTONES_READ)
  listEvaluations(
    @CurrentTenant() tenant: TenantContext,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
  ) {
    return this.milestones.listEvaluations(tenant, milestoneId);
  }
}
