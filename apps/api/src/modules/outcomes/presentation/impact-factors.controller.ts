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
import { ImpactFactorService } from '../application/impact-factor.service.js';
import { CreateImpactFactorDto } from '../dto/create-impact-factor.dto.js';
import { ListImpactFactorsQuery } from '../dto/list-impact-factors.query.js';
import { UpdateImpactFactorDto } from '../dto/update-impact-factor.dto.js';

@Controller('impact-factors')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class ImpactFactorsController {
  constructor(private readonly factors: ImpactFactorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.IMPACT_FACTORS_CREATE)
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateImpactFactorDto,
  ) {
    return this.factors.create(tenant, user.userId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.IMPACT_FACTORS_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListImpactFactorsQuery,
  ) {
    return this.factors.list(tenant, query.campaignId ?? null);
  }

  @Get(':impactFactorId')
  @RequirePermission(PERMISSIONS.IMPACT_FACTORS_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('impactFactorId', ParseUUIDPipe) impactFactorId: string,
  ) {
    return this.factors.get(tenant, impactFactorId);
  }

  @Patch(':impactFactorId')
  @RequirePermission(PERMISSIONS.IMPACT_FACTORS_UPDATE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('impactFactorId', ParseUUIDPipe) impactFactorId: string,
    @Body() dto: UpdateImpactFactorDto,
  ) {
    return this.factors.update(tenant, impactFactorId, dto);
  }
}
