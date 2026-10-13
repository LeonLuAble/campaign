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
import { ParticipationService } from '../application/participation.service.js';
import { CreateParticipationDto } from '../dto/create-participation.dto.js';

@Controller('campaigns/:campaignId/participations')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CampaignParticipationsController {
  constructor(private readonly participations: ParticipationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  enroll(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Body() dto: CreateParticipationDto,
  ) {
    return this.participations.enroll(
      tenant,
      campaignId,
      user.userId,
      dto?.userId,
    );
  }

  @Get()
  @RequirePermission(PERMISSIONS.PARTICIPATIONS_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
  ) {
    return this.participations.listForCampaign(tenant, campaignId);
  }
}
