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
import { MilestoneService } from '../application/milestone.service.js';
import { CreateMilestoneDto } from '../dto/create-milestone.dto.js';

@Controller('campaigns/:campaignId/milestones')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CampaignMilestonesController {
  constructor(private readonly milestones: MilestoneService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.MILESTONES_CREATE)
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.milestones.create(tenant, campaignId, user.userId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.MILESTONES_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.milestones.listForCampaign(tenant, campaignId);
  }
}
