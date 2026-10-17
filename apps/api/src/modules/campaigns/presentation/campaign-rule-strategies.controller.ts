import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { PermissionsGuard } from '../../authorization/presentation/permissions.guard.js';
import { RequirePermission } from '../../authorization/presentation/require-permission.decorator.js';
import { TenantScopeGuard } from '../../authorization/presentation/tenant-scope.guard.js';
import type { SupportedLocale } from '../../localization/application/locale-catalog.js';
import { AcceptLanguage } from '../../localization/presentation/accept-language.decorator.js';
import { CampaignRuleStrategyCatalogService } from '../application/campaign-rule-strategy-catalog.service.js';

@Controller('campaign-rule-strategies')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CampaignRuleStrategiesController {
  constructor(
    private readonly catalog: CampaignRuleStrategyCatalogService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.CAMPAIGNS_READ)
  list(@AcceptLanguage() locale: SupportedLocale) {
    return this.catalog.list(locale);
  }
}
