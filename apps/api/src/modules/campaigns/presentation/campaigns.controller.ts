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
  Put,
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
import type { SupportedLocale } from '../../localization/application/locale-catalog.js';
import { AcceptLanguage } from '../../localization/presentation/accept-language.decorator.js';
import { CampaignService } from '../application/campaign.service.js';
import { CreateCampaignDto } from '../dto/create-campaign.dto.js';
import { ReplaceCampaignCommunitiesDto } from '../dto/replace-campaign-communities.dto.js';
import { ReplaceCampaignConfigurationDto } from '../dto/replace-campaign-configuration.dto.js';
import { UpdateCampaignDto } from '../dto/update-campaign.dto.js';

@Controller('campaigns')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CampaignsController {
  constructor(private readonly campaigns: CampaignService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.CAMPAIGNS_CREATE)
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCampaignDto,
    @AcceptLanguage() locale: SupportedLocale,
  ) {
    return this.campaigns.createCampaign(tenant, user.userId, dto, locale);
  }

  @Get()
  @RequirePermission(PERMISSIONS.CAMPAIGNS_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @AcceptLanguage() locale: SupportedLocale,
  ) {
    return this.campaigns.listCampaigns(tenant, locale, user.userId);
  }

  @Get(':campaignId')
  @RequirePermission(PERMISSIONS.CAMPAIGNS_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @AcceptLanguage() locale: SupportedLocale,
  ) {
    return this.campaigns.getCampaign(tenant, campaignId, locale, user.userId);
  }

  @Patch(':campaignId')
  @RequirePermission(PERMISSIONS.CAMPAIGNS_UPDATE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: UpdateCampaignDto,
    @AcceptLanguage() locale: SupportedLocale,
  ) {
    return this.campaigns.updateCampaign(tenant, campaignId, dto, locale);
  }

  @Post(':campaignId/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.CAMPAIGNS_UPDATE)
  publish(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.campaigns.publishCampaign(tenant, campaignId);
  }

  @Post(':campaignId/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.CAMPAIGNS_UPDATE)
  start(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.campaigns.startCampaign(tenant, campaignId);
  }

  @Post(':campaignId/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.CAMPAIGNS_UPDATE)
  complete(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.campaigns.completeCampaign(tenant, campaignId);
  }

  @Get(':campaignId/configuration')
  @RequirePermission(PERMISSIONS.CAMPAIGNS_READ)
  getConfiguration(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.campaigns.getConfiguration(tenant, campaignId);
  }

  @Put(':campaignId/configuration')
  @RequirePermission(PERMISSIONS.CAMPAIGNS_UPDATE)
  replaceConfiguration(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: ReplaceCampaignConfigurationDto,
  ) {
    return this.campaigns.replaceConfiguration(
      tenant,
      campaignId,
      dto.settings,
    );
  }

  @Get(':campaignId/communities')
  @RequirePermission(PERMISSIONS.CAMPAIGNS_READ)
  listCommunities(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.campaigns.listTargetCommunities(tenant, campaignId);
  }

  @Put(':campaignId/communities')
  @RequirePermission(PERMISSIONS.CAMPAIGNS_UPDATE)
  replaceCommunities(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: ReplaceCampaignCommunitiesDto,
  ) {
    return this.campaigns.replaceTargetCommunities(
      tenant,
      campaignId,
      dto.communityIds,
    );
  }
}
