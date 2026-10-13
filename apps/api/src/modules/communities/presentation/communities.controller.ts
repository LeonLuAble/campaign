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
import { CommunityService } from '../application/community.service.js';
import { CreateCommunityDto } from '../dto/create-community.dto.js';
import { UpdateCommunityDto } from '../dto/update-community.dto.js';

@Controller('communities')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CommunitiesController {
  constructor(private readonly communities: CommunityService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.COMMUNITIES_CREATE)
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateCommunityDto,
  ) {
    return this.communities.create(tenant, {
      parentId: dto.parentId ?? null,
      name: dto.name,
    });
  }

  @Get()
  @RequirePermission(PERMISSIONS.COMMUNITIES_READ)
  list(@CurrentTenant() tenant: TenantContext) {
    return this.communities.list(tenant);
  }

  @Get(':communityId')
  @RequirePermission(PERMISSIONS.COMMUNITIES_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    return this.communities.get(tenant, communityId);
  }

  @Patch(':communityId')
  @RequirePermission(PERMISSIONS.COMMUNITIES_UPDATE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Body() dto: UpdateCommunityDto,
  ) {
    return this.communities.update(tenant, communityId, dto);
  }
}
