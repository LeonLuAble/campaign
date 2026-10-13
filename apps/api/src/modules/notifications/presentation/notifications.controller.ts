import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
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
import { ResourceNotFoundException } from '../../../shared/errors/domain-http.exceptions.js';
import { NotificationService } from '../application/notification.service.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantScopeGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @RequirePermission(PERMISSIONS.NOTIFICATIONS_READ)
  list(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query('customerId', ParseUUIDPipe) customerId: string,
  ) {
    this.assertCustomer(tenant, customerId);
    return this.notifications.list(tenant, user.userId);
  }

  @Get(':notificationId')
  @RequirePermission(PERMISSIONS.NOTIFICATIONS_READ)
  get(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
    @Query('customerId', ParseUUIDPipe) customerId: string,
  ) {
    this.assertCustomer(tenant, customerId);
    return this.notifications.get(tenant, user.userId, notificationId);
  }

  @Post(':notificationId/read')
  @HttpCode(200)
  @RequirePermission(PERMISSIONS.NOTIFICATIONS_UPDATE)
  markRead(
    @CurrentTenant() tenant: TenantContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
    @Query('customerId', ParseUUIDPipe) customerId: string,
  ) {
    this.assertCustomer(tenant, customerId);
    return this.notifications.markRead(tenant, user.userId, notificationId);
  }

  private assertCustomer(tenant: TenantContext, customerId: string): void {
    if (tenant.tenantId !== customerId) {
      throw new ResourceNotFoundException('Notification not found');
    }
  }
}
