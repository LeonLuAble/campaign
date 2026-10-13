import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parseLocalTimeToMinutes } from '../../campaigns/application/timezone.js';
import { UserNotificationPreference } from '../domain/user-notification-preference.entity.js';
import {
  defaultNotificationPreferences,
  normalizeReminderLocalTime,
  type NotificationPreferenceSnapshot,
} from './notification-preferences.js';

export interface UpdateNotificationPreferencesInput {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  remindersEnabled?: boolean;
  reminderLocalTime?: string;
}

@Injectable()
export class NotificationPreferenceService {
  constructor(
    @InjectRepository(UserNotificationPreference)
    private readonly preferenceRepository: Repository<UserNotificationPreference>,
  ) {}

  async get(userId: string): Promise<NotificationPreferenceSnapshot> {
    const row = await this.preferenceRepository.findOne({
      where: { user_id: userId },
    });
    return row ? this.toSnapshot(row) : defaultNotificationPreferences(userId);
  }

  async upsert(
    userId: string,
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferenceSnapshot> {
    const existing = await this.preferenceRepository.findOne({
      where: { user_id: userId },
    });
    const defaults = defaultNotificationPreferences(userId);
    const reminderLocalTime =
      input.reminderLocalTime !== undefined
        ? this.normalizeTime(input.reminderLocalTime)
        : existing
          ? normalizeReminderLocalTime(String(existing.reminder_local_time))
          : defaults.reminderLocalTime;
    const saved = await this.preferenceRepository.save(
      this.preferenceRepository.create({
        user_id: userId,
        in_app_enabled: input.inAppEnabled ?? existing?.in_app_enabled ?? true,
        email_enabled: input.emailEnabled ?? existing?.email_enabled ?? true,
        sms_enabled: input.smsEnabled ?? existing?.sms_enabled ?? false,
        push_enabled: input.pushEnabled ?? existing?.push_enabled ?? false,
        reminders_enabled:
          input.remindersEnabled ?? existing?.reminders_enabled ?? true,
        reminder_local_time: reminderLocalTime,
      }),
    );
    return this.toSnapshot(saved);
  }

  private normalizeTime(value: string): string {
    parseLocalTimeToMinutes(value, 'reminderLocalTime');
    return value.trim();
  }

  private toSnapshot(
    row: UserNotificationPreference,
  ): NotificationPreferenceSnapshot {
    return {
      userId: row.user_id,
      inAppEnabled: row.in_app_enabled,
      emailEnabled: row.email_enabled,
      smsEnabled: row.sms_enabled,
      pushEnabled: row.push_enabled,
      remindersEnabled: row.reminders_enabled,
      reminderLocalTime: normalizeReminderLocalTime(
        String(row.reminder_local_time),
      ),
    };
  }
}
