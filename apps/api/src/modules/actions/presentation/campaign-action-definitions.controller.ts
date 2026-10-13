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
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CurrentTenant } from '../../authorization/presentation/current-tenant.decorator.js';
import { PermissionsGuard } from '../../authorization/presentation/permissions.guard.js';
import { RequirePermission } from '../../authorization/presentation/require-permission.decorator.js';
import { TenantScopeGuard } from '../../authorization/presentation/tenant-scope.guard.js';
import { ActionService } from '../application/action.service.js';
import { CreateActionDefinitionDto } from '../dto/create-action-definition.dto.js';

@Controller('campaigns/:campaignId/action-definitions')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CampaignActionDefinitionsController {
  constructor(private readonly actions: ActionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.ACTION_DEFINITIONS_CREATE)
  create(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateActionDefinitionDto,
  ) {
    return this.actions.createDefinition(tenant, campaignId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.ACTION_DEFINITIONS_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.actions.listDefinitions(tenant, campaignId);
  }
}
