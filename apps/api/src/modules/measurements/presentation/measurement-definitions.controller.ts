import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CurrentTenant } from '../../authorization/presentation/current-tenant.decorator.js';
import { PermissionsGuard } from '../../authorization/presentation/permissions.guard.js';
import { RequirePermission } from '../../authorization/presentation/require-permission.decorator.js';
import { TenantScopeGuard } from '../../authorization/presentation/tenant-scope.guard.js';
import { MeasurementDefinitionService } from '../application/measurement-definition.service.js';
import { UpdateMeasurementDefinitionDto } from '../dto/update-measurement-definition.dto.js';

@Controller('measurement-definitions')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class MeasurementDefinitionsController {
  constructor(private readonly definitions: MeasurementDefinitionService) {}

  @Get(':measurementDefinitionId')
  @RequirePermission(PERMISSIONS.MEASUREMENT_DEFINITIONS_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('measurementDefinitionId', ParseUUIDPipe)
    measurementDefinitionId: string,
  ) {
    return this.definitions.get(tenant, measurementDefinitionId);
  }

  @Patch(':measurementDefinitionId')
  @RequirePermission(PERMISSIONS.MEASUREMENT_DEFINITIONS_UPDATE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('measurementDefinitionId', ParseUUIDPipe)
    measurementDefinitionId: string,
    @Body() dto: UpdateMeasurementDefinitionDto,
  ) {
    return this.definitions.update(tenant, measurementDefinitionId, dto);
  }
}
