import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../platform/redis/redis.service.js';
import { ActionService } from '../../actions/application/action.service.js';
import { calendarDateInTimeZone } from '../../campaigns/application/timezone.js';
import { CampaignService } from '../../campaigns/application/campaign.service.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import { ParticipationService } from '../../participation/application/participation.service.js';
import { NotificationDispatchService } from './notification-dispatch.service.js';
import { NotificationPreferenceService } from './preference.service.js';
import { shouldSendActionReminder } from './reminder-eligibility.js';

const REMINDER_LOCK_KEY = 'notifications:reminder:tick';
const REMINDER_LOCK_TTL_SECONDS = 50;

@Injectable()
export class ReminderScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly enabled: boolean;
  private readonly intervalMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly dispatch: NotificationDispatchService,
    private readonly preferences: NotificationPreferenceService,
    private readonly identities: IdentityAccountService,
    @Inject(forwardRef(() => CampaignService))
    private readonly campaigns: CampaignService,
    @Inject(forwardRef(() => ParticipationService))
    private readonly participations: ParticipationService,
    @Inject(forwardRef(() => ActionService))
    private readonly actions: ActionService,
  ) {
    this.enabled = Boolean(
      this.config.get('notifications.reminderSchedulerEnabled'),
    );
    this.intervalMs = Number(
      this.config.get('notifications.reminderSchedulerIntervalMs') ?? 60_000,
    );
  }

  onModuleInit(): void {
    if (!this.enabled) {
      return;
    }
    this.timer = setInterval(() => {
      void this.processDueReminders().catch((error: unknown) => {
        this.logger.error({
          msg: 'reminder_tick_failed',
          error: error instanceof Error ? error.message : 'unknown',
        });
      });
    }, this.intervalMs);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async processDueReminders(now = new Date()): Promise<number> {
    let locked: boolean;
    try {
      locked = await this.redis.tryAcquireLock(
        REMINDER_LOCK_KEY,
        REMINDER_LOCK_TTL_SECONDS,
      );
    } catch (error) {
      this.logger.warn({
        msg: 'reminder_lock_failed',
        error: error instanceof Error ? error.message : 'unknown',
      });
      return 0;
    }
    if (!locked) {
      return 0;
    }
    let sent = 0;
    try {
      const campaigns = await this.campaigns.listStartedCampaigns();
      for (const campaign of campaigns) {
        const enrolled = await this.participations.listEnrolledByCampaign(
          campaign.tenantId,
          campaign.id,
        );
        const occurredOn = calendarDateInTimeZone(now, campaign.timezone);
        for (const participation of enrolled) {
          const profile = await this.identities.getProfile(
            participation.userId,
          );
          if (!profile?.isActive) {
            continue;
          }
          const preferences = await this.preferences.get(participation.userId);
          const hasApprovedActionToday = await this.actions.hasApprovedActionOn(
            campaign.tenantId,
            participation.id,
            occurredOn,
          );
          const decision = shouldSendActionReminder({
            now,
            candidate: {
              tenantId: campaign.tenantId,
              campaignId: campaign.id,
              campaignName: campaign.name,
              campaignTimezone: campaign.timezone,
              startsOn: campaign.startsOn,
              endsOn: campaign.endsOn,
              participationId: participation.id,
              userId: participation.userId,
              userTimezone: profile.timezone,
            },
            preferences,
            hasApprovedActionToday,
          });
          if (!decision.eligible) {
            continue;
          }
          const created = await this.dispatch.dispatch({
            tenantId: campaign.tenantId,
            userId: participation.userId,
            type: 'action_reminder',
            campaignId: campaign.id,
            occurredOn: decision.occurredOn,
            variables: {
              campaignName: campaign.name,
              occurredOn: decision.occurredOn,
            },
            payload: {
              campaignId: campaign.id,
              participationId: participation.id,
              occurredOn: decision.occurredOn,
            },
          });
          if (created) {
            sent += 1;
          }
        }
      }
      this.logger.log({ msg: 'reminder_tick_completed', sent });
      return sent;
    } finally {
      await this.redis.releaseLock(REMINDER_LOCK_KEY);
    }
  }
}
