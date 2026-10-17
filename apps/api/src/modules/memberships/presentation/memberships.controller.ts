import {
  Body,
  Controller,
  Delete,
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
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { CurrentTenant } from '../../authorization/presentation/current-tenant.decorator.js';
import { PermissionsGuard } from '../../authorization/presentation/permissions.guard.js';
import { RequirePermission } from '../../authorization/presentation/require-permission.decorator.js';
import { TenantScopeGuard } from '../../authorization/presentation/tenant-scope.guard.js';
import { MembershipInvitationService } from '../application/membership-invitation.service.js';
import { MembershipService } from '../application/membership.service.js';
import { AssignRoleDto } from '../dto/assign-role.dto.js';
import { CreateMembershipDto } from '../dto/create-membership.dto.js';
import { InviteMembershipDto } from '../dto/invite-membership.dto.js';
import { ListMembershipsDto } from '../dto/list-memberships.dto.js';
import { UpdateMembershipDto } from '../dto/update-membership.dto.js';

@Controller('memberships')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class MembershipsController {
  constructor(
    private readonly memberships: MembershipService,
    private readonly invitations: MembershipInvitationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.MEMBERSHIPS_CREATE)
  create(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: CreateMembershipDto,
  ) {
    return this.memberships.create(tenant, {
      userId: dto.userId,
      communityId: dto.communityId ?? null,
    });
  }

  @Post('invitations')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.MEMBERSHIPS_CREATE)
  invite(
    @CurrentTenant() tenant: TenantContext,
    @Body() dto: InviteMembershipDto,
  ) {
    return this.invitations.invite(tenant, {
      email: dto.email,
      mobile: dto.mobile,
      displayName: dto.displayName,
      communityId: dto.communityId ?? null,
      roleKeys: dto.roleKeys,
    });
  }

  @Get()
  @RequirePermission(PERMISSIONS.MEMBERSHIPS_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Query() query: ListMembershipsDto,
  ) {
    return this.memberships.list(tenant, {
      q: query.q,
      communityId: query.communityId,
      includeDescendants: query.includeDescendants,
      roleKey: query.roleKey,
      status: query.status,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Get(':membershipId')
  @RequirePermission(PERMISSIONS.MEMBERSHIPS_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
  ) {
    return this.memberships.get(tenant, membershipId);
  }

  @Patch(':membershipId')
  @RequirePermission(PERMISSIONS.MEMBERSHIPS_UPDATE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    return this.memberships.update(tenant, membershipId, dto);
  }

  @Post(':membershipId/resend-activation')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission(PERMISSIONS.MEMBERSHIPS_UPDATE)
  resendActivation(
    @CurrentTenant() tenant: TenantContext,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
  ) {
    return this.invitations.resendActivation(tenant, membershipId);
  }

  @Delete(':membershipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PERMISSIONS.MEMBERSHIPS_DELETE)
  async deactivate(
    @CurrentTenant() tenant: TenantContext,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
  ) {
    await this.memberships.deactivate(tenant, membershipId);
  }

  @Get(':membershipId/roles')
  @RequirePermission(PERMISSIONS.ROLES_READ)
  listRoles(
    @CurrentTenant() tenant: TenantContext,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
  ) {
    return this.memberships.listRoles(tenant, membershipId);
  }

  @Post(':membershipId/roles')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.ROLES_ASSIGN)
  assignRole(
    @CurrentTenant() tenant: TenantContext,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: AssignRoleDto,
  ) {
    return this.memberships.assignRole(tenant, membershipId, dto.roleId);
  }

  @Delete(':membershipId/roles/:roleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PERMISSIONS.ROLES_ASSIGN)
  async unassignRole(
    @CurrentTenant() tenant: TenantContext,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    await this.memberships.unassignRole(tenant, membershipId, roleId);
  }
}
