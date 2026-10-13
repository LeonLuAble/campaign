export const DEFAULT_REMINDER_LOCAL_TIME = '09:00';

export interface NotificationPreferenceSnapshot {
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  remindersEnabled: boolean;
  reminderLocalTime: string;
}

export function defaultNotificationPreferences(
  userId: string,
): NotificationPreferenceSnapshot {
  return {
    userId,
    inAppEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: false,
    remindersEnabled: true,
    reminderLocalTime: DEFAULT_REMINDER_LOCAL_TIME,
  };
}

export function normalizeReminderLocalTime(value: string): string {
  const [hours, minutes] = value.trim().slice(0, 5).split(':');
  return `${hours}:${minutes}`;
}
