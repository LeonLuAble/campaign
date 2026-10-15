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
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../auth/presentation/current-user.decorator.js';
import { PERMISSIONS } from '../../authorization/domain/permission-keys.js';
import { PermissionsGuard } from '../../authorization/presentation/permissions.guard.js';
import { RequirePermission } from '../../authorization/presentation/require-permission.decorator.js';
import { TenantScopeGuard } from '../../authorization/presentation/tenant-scope.guard.js';
import { CurrentTenant } from '../../authorization/presentation/current-tenant.decorator.js';
import type { TenantContext } from '../../authorization/application/tenant-context.js';
import { CustomerService } from '../application/customer.service.js';
import { CreateCustomerDto } from '../dto/create-customer.dto.js';
import { UpdateCustomerDto } from '../dto/update-customer.dto.js';
import { PlatformAdminGuard } from './platform-admin.guard.js';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customers: CustomerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(PlatformAdminGuard)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customers.create(user.userId, {
      name: dto.name,
      initialAdminUserId: dto.initialAdminUserId,
      initialAdmin: dto.initialAdmin
        ? {
            displayName: dto.initialAdmin.displayName,
            email: dto.initialAdmin.email,
          }
        : undefined,
    });
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.customers.listForUser(user.userId);
  }

  @Get(':customerId')
  @UseGuards(TenantScopeGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.CUSTOMERS_READ)
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ) {
    return this.customers.getForUser(user.userId, customerId);
  }

  @Patch(':customerId')
  @UseGuards(TenantScopeGuard, PermissionsGuard)
  @RequirePermission(PERMISSIONS.CUSTOMERS_UPDATE)
  update(
    @CurrentTenant() tenant: TenantContext,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(customerId, dto, tenant.memberships);
  }
}
