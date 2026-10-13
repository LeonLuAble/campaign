import {
  Body,
  Controller,
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
import { ActionService } from '../application/action.service.js';
import { ReviewSubmissionDto } from '../dto/update-action.dto.js';

@Controller('submissions')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class SubmissionsController {
  constructor(private readonly actions: ActionService) {}

  @Post(':submissionId/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.SUBMISSIONS_UPDATE)
  approve(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.actions.approveSubmission(
      tenant,
      submissionId,
      user.userId,
      dto?.note,
    );
  }

  @Post(':submissionId/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.SUBMISSIONS_UPDATE)
  reject(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.actions.rejectSubmission(
      tenant,
      submissionId,
      user.userId,
      dto?.note,
    );
  }
}
