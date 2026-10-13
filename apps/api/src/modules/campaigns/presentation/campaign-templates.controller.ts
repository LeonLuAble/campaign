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
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CurrentTenant } from '../../authorization/presentation/current-tenant.decorator.js';
import { PermissionsGuard } from '../../authorization/presentation/permissions.guard.js';
import { RequirePermission } from '../../authorization/presentation/require-permission.decorator.js';
import { TenantScopeGuard } from '../../authorization/presentation/tenant-scope.guard.js';
import { CampaignService } from '../application/campaign.service.js';
import { CreateCampaignTemplateDto } from '../dto/create-campaign-template.dto.js';
import { UpdateCampaignTemplateDto } from '../dto/update-campaign-template.dto.js';

@Controller('campaign-templates')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CampaignTemplatesController {
  constructor(private readonly campaigns: CampaignService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.CAMPAIGN_TEMPLATES_CREATE)
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateCampaignTemplateDto,
  ) {
    return this.campaigns.createTemplate(tenant, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.CAMPAIGN_TEMPLATES_READ)
  list(@CurrentTenant() tenant: TenantContext) {
    return this.campaigns.listTemplates(tenant);
  }

  @Get(':templateId')
  @RequirePermission(PERMISSIONS.CAMPAIGN_TEMPLATES_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.campaigns.getTemplate(tenant, templateId);
  }

  @Patch(':templateId')
  @RequirePermission(PERMISSIONS.CAMPAIGN_TEMPLATES_UPDATE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() dto: UpdateCampaignTemplateDto,
  ) {
    return this.campaigns.updateTemplate(tenant, templateId, dto);
  }
}
