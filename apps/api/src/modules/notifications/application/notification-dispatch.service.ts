import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '../../../shared/database/postgres-errors.js';
import {
  EMAIL_TRANSPORT,
  PUSH_TRANSPORT,
  SMS_TRANSPORT,
  type EmailTransport,
  type PushTransport,
  type SmsTransport,
} from '../../../platform/notifications/outbound-transports.js';
import {
  NOTIFICATION_SENDER,
  type NotificationSender,
} from '../../auth/application/notification-sender.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import { IdentityType } from '../../identity/domain/user-identity.entity.js';
import {
  renderNotificationTemplate,
  type CampaignNotificationType,
} from '../../localization/application/locale-catalog.js';
import { ParticipationService } from '../../participation/application/participation.service.js';
import { NotificationDelivery } from '../domain/notification-delivery.entity.js';
import { InAppNotification } from '../domain/notification.entity.js';
import type {
  CampaignNotifications,
  CampaignStartedNotification,
  MilestoneAchievedNotification,
} from './campaign-notifications.js';
import { NotificationPreferenceService } from './preference.service.js';
import { deliveryDedupeKey } from './reminder-eligibility.js';

export interface DispatchNotificationInput {
  tenantId: string;
  userId: string;
  type: CampaignNotificationType;
  campaignId: string;
  occurredOn: string;
  variables: Record<string, string>;
  payload?: Record<string, string>;
}

@Injectable()
export class NotificationDispatchService implements CampaignNotifications {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    @InjectRepository(InAppNotification)
    private readonly notificationRepository: Repository<InAppNotification>,
    @InjectRepository(NotificationDelivery)
    private readonly deliveryRepository: Repository<NotificationDelivery>,
    private readonly preferences: NotificationPreferenceService,
    private readonly identities: IdentityAccountService,
    @Inject(forwardRef(() => ParticipationService))
    private readonly participations: ParticipationService,
    @Inject(NOTIFICATION_SENDER)
    private readonly notificationSender: NotificationSender,
    @Inject(EMAIL_TRANSPORT)
    private readonly emailTransport: EmailTransport,
    @Inject(SMS_TRANSPORT)
    private readonly smsTransport: SmsTransport,
    @Inject(PUSH_TRANSPORT)
    private readonly pushTransport: PushTransport,
    private readonly config: ConfigService,
  ) {}

  async notifyCampaignStarted(
    input: CampaignStartedNotification,
  ): Promise<void> {
    const enrolled = await this.participations.listEnrolledByCampaign(
      input.tenantId,
      input.campaignId,
    );
    for (const participation of enrolled) {
      await this.dispatch({
        tenantId: input.tenantId,
        userId: participation.userId,
        type: 'campaign_started',
        campaignId: input.campaignId,
        occurredOn: 'started',
        variables: { campaignName: input.campaignName },
        payload: {
          campaignId: input.campaignId,
          participationId: participation.id,
        },
      });
    }
  }

  async notifyMilestoneAchieved(
    input: MilestoneAchievedNotification,
  ): Promise<void> {
    const enrolled = await this.participations.listEnrolledByCampaign(
      input.tenantId,
      input.campaignId,
    );
    for (const participation of enrolled) {
      await this.dispatch({
        tenantId: input.tenantId,
        userId: participation.userId,
        type: 'milestone_achieved',
        campaignId: input.campaignId,
        occurredOn: input.milestoneId,
        variables: {
          campaignName: input.campaignName,
          milestoneName: input.milestoneName,
        },
        payload: {
          campaignId: input.campaignId,
          milestoneId: input.milestoneId,
          participationId: participation.id,
        },
      });
    }
  }

  async dispatch(input: DispatchNotificationInput): Promise<boolean> {
    const prefs = await this.preferences.get(input.userId);
    const profile = await this.identities.getProfile(input.userId);
    if (!profile?.isActive) {
      return false;
    }
    const rendered = renderNotificationTemplate(
      profile.locale,
      input.type,
      input.variables,
    );
    const payload = input.payload ?? {};
    let notificationId: string | null = null;

    if (prefs.inAppEnabled) {
      notificationId = await this.insertInApp(input, rendered, payload);
    } else {
      await this.recordDelivery({
        input,
        notificationId: null,
        channel: 'in_app',
        status: 'skipped',
        skipReason: 'opted_out',
        provider: 'in_app',
      });
    }

    const identities = await this.identities.listIdentitiesForUser(
      input.userId,
    );
    await this.deliverChannel({
      input,
      notificationId,
      channel: 'email',
      enabled: prefs.emailEnabled,
      rendered,
      destination: identities.find((row) => row.type === IdentityType.EMAIL)
        ?.identifier,
      provider: this.config.get<string>('notifications.emailProvider') ?? 'dev',
    });
    await this.deliverChannel({
      input,
      notificationId,
      channel: 'sms',
      enabled: prefs.smsEnabled,
      rendered,
      destination: identities.find((row) => row.type === IdentityType.MOBILE)
        ?.identifier,
      provider: this.config.get<string>('notifications.smsProvider') ?? 'dev',
    });
    await this.deliverChannel({
      input,
      notificationId,
      channel: 'push',
      enabled: prefs.pushEnabled,
      rendered,
      destination: input.userId,
      provider: this.config.get<string>('notifications.pushProvider') ?? 'dev',
    });
    return notificationId != null;
  }

  private async insertInApp(
    input: DispatchNotificationInput,
    rendered: { locale: string; title: string; body: string },
    payload: Record<string, string>,
  ): Promise<string | null> {
    const claimed = await this.recordDelivery({
      input,
      notificationId: null,
      channel: 'in_app',
      status: 'pending',
      skipReason: null,
      provider: 'in_app',
    });
    if (!claimed) {
      return null;
    }
    const saved = await this.notificationRepository.save(
      this.notificationRepository.create({
        tenant_id: input.tenantId,
        user_id: input.userId,
        type: input.type,
        locale: rendered.locale,
        title: rendered.title,
        body: rendered.body,
        payload,
        read_at: null,
      }),
    );
    claimed.notification_id = saved.id;
    claimed.status = 'sent';
    claimed.sent_at = new Date();
    await this.deliveryRepository.save(claimed);
    return saved.id;
  }

  private async deliverChannel(options: {
    input: DispatchNotificationInput;
    notificationId: string | null;
    channel: 'email' | 'sms' | 'push';
    enabled: boolean;
    rendered: { locale: string; title: string; body: string };
    destination: string | undefined;
    provider: string;
  }): Promise<void> {
    const { input, channel, enabled, rendered, destination, provider } =
      options;
    if (!enabled) {
      await this.recordDelivery({
        input,
        notificationId: options.notificationId,
        channel,
        status: 'skipped',
        skipReason: 'opted_out',
        provider,
      });
      return;
    }
    if (!destination) {
      await this.recordDelivery({
        input,
        notificationId: options.notificationId,
        channel,
        status: 'skipped',
        skipReason: 'no_destination',
        provider,
      });
      return;
    }

    const claimed = await this.recordDelivery({
      input,
      notificationId: options.notificationId,
      channel,
      status: 'pending',
      skipReason: null,
      provider,
    });
    if (!claimed) {
      return;
    }

    const message = {
      channel,
      to: destination,
      template: input.type,
      locale: rendered.locale,
      subject: rendered.title,
      body: rendered.body,
      payload: input.variables,
    };

    try {
      if (channel === 'email') {
        await this.notificationSender.send(message);
        await this.emailTransport.send(message);
      } else if (channel === 'sms') {
        await this.notificationSender.send(message);
        await this.smsTransport.send(message);
      } else {
        await this.pushTransport.send(message);
      }
      claimed.status = 'sent';
      claimed.sent_at = new Date();
      await this.deliveryRepository.save(claimed);
    } catch (error) {
      this.logger.error({
        msg: 'notification_delivery_failed',
        tenantId: input.tenantId,
        userId: input.userId,
        type: input.type,
        channel,
        error: error instanceof Error ? error.message : 'unknown',
      });
      claimed.status = 'failed';
      claimed.skip_reason = 'provider_error';
      await this.deliveryRepository.save(claimed);
    }
  }

  private async recordDelivery(options: {
    input: DispatchNotificationInput;
    notificationId: string | null;
    channel: 'in_app' | 'email' | 'sms' | 'push';
    status: 'pending' | 'sent' | 'skipped' | 'failed';
    skipReason: string | null;
    provider: string;
  }): Promise<NotificationDelivery | null> {
    const dedupeKey = deliveryDedupeKey({
      tenantId: options.input.tenantId,
      userId: options.input.userId,
      type: options.input.type,
      campaignId: options.input.campaignId,
      occurredOn: options.input.occurredOn,
      channel: options.channel,
    });
    try {
      return await this.deliveryRepository.save(
        this.deliveryRepository.create({
          notification_id: options.notificationId,
          tenant_id: options.input.tenantId,
          user_id: options.input.userId,
          channel: options.channel,
          template: options.input.type,
          status: options.status,
          skip_reason: options.skipReason,
          provider: options.provider,
          dedupe_key: dedupeKey,
          scheduled_at: new Date(),
          sent_at: options.status === 'sent' ? new Date() : null,
        }),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        this.logger.log({
          msg: 'notification_delivery_deduped',
          tenantId: options.input.tenantId,
          userId: options.input.userId,
          type: options.input.type,
          channel: options.channel,
        });
        return null;
      }
      throw error;
    }
  }
}
