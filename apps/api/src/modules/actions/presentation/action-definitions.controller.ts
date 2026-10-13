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
import { ActionService } from '../application/action.service.js';
import { UpdateActionDefinitionDto } from '../dto/update-action-definition.dto.js';

@Controller('action-definitions')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class ActionDefinitionsController {
  constructor(private readonly actions: ActionService) {}

  @Get(':actionDefinitionId')
  @RequirePermission(PERMISSIONS.ACTION_DEFINITIONS_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('actionDefinitionId', ParseUUIDPipe) actionDefinitionId: string,
  ) {
    return this.actions.getDefinition(tenant, actionDefinitionId);
  }

  @Patch(':actionDefinitionId')
  @RequirePermission(PERMISSIONS.ACTION_DEFINITIONS_UPDATE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('actionDefinitionId', ParseUUIDPipe) actionDefinitionId: string,
    @Body() dto: UpdateActionDefinitionDto,
  ) {
    return this.actions.updateDefinition(tenant, actionDefinitionId, dto);
  }
}
