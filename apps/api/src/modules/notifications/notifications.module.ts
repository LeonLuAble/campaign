import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboundNotificationsModule } from '../../platform/notifications/outbound-notifications.module.js';
import { RedisModule } from '../../platform/redis/redis.module.js';
import { ActionsModule } from '../actions/actions.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { ParticipationModule } from '../participation/participation.module.js';
import { CAMPAIGN_NOTIFICATIONS } from './application/campaign-notifications.js';
import { NotificationDispatchService } from './application/notification-dispatch.service.js';
import { NotificationService } from './application/notification.service.js';
import { NotificationPreferenceService } from './application/preference.service.js';
import { ReminderScheduler } from './application/reminder-scheduler.js';
import { NotificationDelivery } from './domain/notification-delivery.entity.js';
import { InAppNotification } from './domain/notification.entity.js';
import { UserNotificationPreference } from './domain/user-notification-preference.entity.js';
import { NotificationPreferencesController } from './presentation/notification-preferences.controller.js';
import { NotificationsController } from './presentation/notifications.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InAppNotification,
      NotificationDelivery,
      UserNotificationPreference,
    ]),
    AuthModule,
    IdentityModule,
    RedisModule,
    OutboundNotificationsModule,
    forwardRef(() => AuthorizationModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => CampaignsModule),
    forwardRef(() => ParticipationModule),
    forwardRef(() => ActionsModule),
  ],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    NotificationService,
    NotificationPreferenceService,
    NotificationDispatchService,
    ReminderScheduler,
    {
      provide: CAMPAIGN_NOTIFICATIONS,
      useExisting: NotificationDispatchService,
    },
  ],
  exports: [
    NotificationService,
    NotificationPreferenceService,
    NotificationDispatchService,
    ReminderScheduler,
    CAMPAIGN_NOTIFICATIONS,
  ],
})
export class NotificationsModule {}
