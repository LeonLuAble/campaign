import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CommitmentService } from '../application/commitment.service.js';
import { UpdateCommitmentDto } from '../dto/update-commitment.dto.js';

@Controller('commitments')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class CommitmentsController {
  constructor(private readonly commitments: CommitmentService) {}

  @Get(':commitmentId')
  @RequirePermission(PERMISSIONS.COMMITMENTS_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @Param('commitmentId', ParseUUIDPipe) commitmentId: string,
  ) {
    return this.commitments.get(tenant, commitmentId);
  }

  @Patch(':commitmentId')
  @RequirePermission(PERMISSIONS.COMMITMENTS_UPDATE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('commitmentId', ParseUUIDPipe) commitmentId: string,
    @Body() dto: UpdateCommitmentDto,
  ) {
    return this.commitments.update(tenant, commitmentId, user.userId, dto);
  }
}
