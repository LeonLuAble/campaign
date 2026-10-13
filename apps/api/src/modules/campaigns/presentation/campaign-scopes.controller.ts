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
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CurrentTenant } from '../../authorization/presentation/current-tenant.decorator.js';
import { PermissionsGuard } from '../../authorization/presentation/permissions.guard.js';
import { RequirePermission } from '../../authorization/presentation/require-permission.decorator.js';
import { TenantScopeGuard } from '../../authorization/presentation/tenant-scope.guard.js';
import { CampaignService } from '../application/campaign.service.js';
import { CreateCampaignScopeDto } from '../dto/create-campaign-scope.dto.js';
import { UpdateCampaignScopeDto } from '../dto/update-campaign-scope.dto.js';

@Controller('campaign-scopes')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CampaignScopesController {
  constructor(private readonly campaigns: CampaignService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.CAMPAIGN_SCOPES_CREATE)
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateCampaignScopeDto,
  ) {
    return this.campaigns.createScope(tenant, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.CAMPAIGN_SCOPES_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Query('templateId') templateId?: string,
  ) {
    return this.campaigns.listScopes(tenant, templateId);
  }

  @Get(':scopeId')
  @RequirePermission(PERMISSIONS.CAMPAIGN_SCOPES_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('scopeId', ParseUUIDPipe) scopeId: string,
  ) {
    return this.campaigns.getScope(tenant, scopeId);
  }

  @Patch(':scopeId')
  @RequirePermission(PERMISSIONS.CAMPAIGN_SCOPES_UPDATE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('scopeId', ParseUUIDPipe) scopeId: string,
    @Body() dto: UpdateCampaignScopeDto,
  ) {
    return this.campaigns.updateScope(tenant, scopeId, dto);
  }
}
