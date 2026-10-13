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
import { CommitmentService } from '../application/commitment.service.js';
import { CreateCommitmentDto } from '../dto/create-commitment.dto.js';

@Controller('participations/:participationId/commitments')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class ParticipationCommitmentsController {
  constructor(private readonly commitments: CommitmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.COMMITMENTS_CREATE)
  create(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('participationId', ParseUUIDPipe) participationId: string,
    @Body() dto: CreateCommitmentDto,
  ) {
    return this.commitments.createOrReplace(
      tenant,
      participationId,
      user.userId,
      dto,
    );
  }

  @Get()
  @RequirePermission(PERMISSIONS.COMMITMENTS_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Param('participationId', ParseUUIDPipe) participationId: string,
  ) {
    return this.commitments.listForParticipation(tenant, participationId);
  }
}
