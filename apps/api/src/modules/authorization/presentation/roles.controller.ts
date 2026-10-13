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
import type { TenantContext } from '../application/tenant-context.js';
import { AuthorizationService } from '../application/authorization.service.js';
import { PERMISSIONS } from '../domain/permission-keys.js';
import { CreateRoleDto } from '../dto/create-role.dto.js';
import { UpdateRoleDto } from '../dto/update-role.dto.js';
import { CurrentTenant } from './current-tenant.decorator.js';
import { PermissionsGuard } from './permissions.guard.js';
import { RequirePermission } from './require-permission.decorator.js';
import { TenantScopeGuard } from './tenant-scope.guard.js';

@Controller('roles')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly authorization: AuthorizationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.ROLES_CREATE)
  create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateRoleDto) {
    return this.authorization.createRole(
      tenant.tenantId,
      dto,
      tenant.memberships,
    );
  }

  @Get()
  @RequirePermission(PERMISSIONS.ROLES_READ)
  list(@CurrentTenant() tenant: TenantContext) {
    return this.authorization.listRoles(tenant.tenantId);
  }

  @Get(':roleId')
  @RequirePermission(PERMISSIONS.ROLES_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.authorization.getRole(tenant.tenantId, roleId);
  }

  @Patch(':roleId')
  @RequirePermission(PERMISSIONS.ROLES_UPDATE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.authorization.updateRole(
      tenant.tenantId,
      roleId,
      dto,
      tenant.memberships,
    );
  }
}
