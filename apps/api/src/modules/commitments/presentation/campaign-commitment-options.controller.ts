import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CurrentTenant } from '../../authorization/presentation/current-tenant.decorator.js';
import { PermissionsGuard } from '../../authorization/presentation/permissions.guard.js';
import { RequirePermission } from '../../authorization/presentation/require-permission.decorator.js';
import { TenantScopeGuard } from '../../authorization/presentation/tenant-scope.guard.js';
import type { SupportedLocale } from '../../localization/application/locale-catalog.js';
import { AcceptLanguage } from '../../localization/presentation/accept-language.decorator.js';
import { CommitmentService } from '../application/commitment.service.js';

@Controller('campaigns/:campaignId')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CampaignCommitmentOptionsController {
  constructor(private readonly commitments: CommitmentService) {}

  @Get('commitment-options')
  @RequirePermission(PERMISSIONS.COMMITMENTS_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @AcceptLanguage() locale: SupportedLocale,
  ) {
    return this.commitments.listCommitmentOptions(tenant, campaignId, locale);
  }
}
