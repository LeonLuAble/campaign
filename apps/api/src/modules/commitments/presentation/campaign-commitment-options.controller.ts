import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';
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
import { PERIOD_KEY_PATTERN } from '../dto/create-commitment.dto.js';

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
    @Query('periodKey') periodKey?: string,
  ) {
    if (periodKey !== undefined && !PERIOD_KEY_PATTERN.test(periodKey)) {
      throw new InvalidRequestException('periodKey must be YYYY-MM-DD');
    }
    return this.commitments.listCommitmentOptions(
      tenant,
      campaignId,
      locale,
      periodKey,
    );
  }
}
