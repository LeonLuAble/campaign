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
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../auth/presentation/current-user.decorator.js';
import { CustomerService } from '../application/customer.service.js';
import { InvitePlatformAdminDto } from '../dto/create-customer.dto.js';
import { PlatformAdminGuard } from './platform-admin.guard.js';

@Controller('platform/customers')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformCustomersController {
  constructor(private readonly customers: CustomerService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.customers.listPlatformCustomers(user.userId);
  }

  @Post(':customerId/admins')
  @HttpCode(HttpStatus.CREATED)
  inviteAdmin(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: InvitePlatformAdminDto,
  ) {
    return this.customers.invitePlatformAdmin(user.userId, customerId, {
      email: dto.email,
      displayName: dto.displayName,
      locale: dto.locale,
    });
  }

  @Post(':customerId/admins/:userId/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  resendActivation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.customers.resendPlatformAdminActivation(
      user.userId,
      customerId,
      userId,
    );
  }
}
