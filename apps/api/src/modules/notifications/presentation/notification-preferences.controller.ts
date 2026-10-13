import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../auth/presentation/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard.js';
import { NotificationPreferenceService } from '../application/preference.service.js';
import { UpdateNotificationPreferencesDto } from '../dto/update-notification-preferences.dto.js';

@Controller('me/notification-preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(private readonly preferences: NotificationPreferenceService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.preferences.get(user.userId);
  }

  @Put()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.preferences.upsert(user.userId, dto);
  }
}
