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
import { MeasurementDefinitionService } from '../application/measurement-definition.service.js';
import { CreateMeasurementDefinitionDto } from '../dto/create-measurement-definition.dto.js';

@Controller('campaigns/:campaignId/measurement-definitions')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CampaignMeasurementDefinitionsController {
  constructor(private readonly definitions: MeasurementDefinitionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.MEASUREMENT_DEFINITIONS_CREATE)
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateMeasurementDefinitionDto,
  ) {
    return this.definitions.create(tenant, campaignId, user.userId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.MEASUREMENT_DEFINITIONS_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.definitions.listForCampaign(tenant, campaignId);
  }
}
