import {
  calendarDateInTimeZone,
  isAtOrAfterLocalTime,
} from '../../campaigns/application/timezone.js';
import type { ParticipationEngagement } from '../../participation/domain/participation-engagement.js';
import type { NotificationPreferenceSnapshot } from './notification-preferences.js';

export interface ReminderCandidate {
  tenantId: string;
  campaignId: string;
  campaignName: string;
  campaignTimezone: string;
  startsOn: string | null;
  endsOn: string | null;
  participationId: string;
  userId: string;
  userTimezone: string | null;
  engagement: ParticipationEngagement;
}

export function reminderTimeZone(candidate: ReminderCandidate): string {
  return candidate.userTimezone?.trim() || candidate.campaignTimezone;
}

export function shouldSendActionReminder(input: {
  now: Date;
  candidate: ReminderCandidate;
  preferences: NotificationPreferenceSnapshot;
  hasApprovedActionToday: boolean;
}): { eligible: boolean; occurredOn: string; reason?: string } {
  const { now, candidate, preferences, hasApprovedActionToday } = input;
  const occurredOn = calendarDateInTimeZone(now, candidate.campaignTimezone);
  if (candidate.engagement === 'withdrawn') {
    return { eligible: false, occurredOn, reason: 'withdrawn' };
  }
  if (candidate.engagement === 'not_taking_part') {
    return { eligible: false, occurredOn, reason: 'not_taking_part' };
  }
  if (!preferences.remindersEnabled) {
    return { eligible: false, occurredOn, reason: 'reminders_disabled' };
  }
  if (candidate.startsOn && occurredOn < candidate.startsOn) {
    return { eligible: false, occurredOn, reason: 'before_campaign_start' };
  }
  if (candidate.endsOn && occurredOn > candidate.endsOn) {
    return { eligible: false, occurredOn, reason: 'after_campaign_end' };
  }
  if (
    !isAtOrAfterLocalTime(
      now,
      reminderTimeZone(candidate),
      preferences.reminderLocalTime,
    )
  ) {
    return { eligible: false, occurredOn, reason: 'before_local_reminder_time' };
  }
  if (hasApprovedActionToday) {
    return { eligible: false, occurredOn, reason: 'action_already_recorded' };
  }
  return { eligible: true, occurredOn };
}

export function deliveryDedupeKey(input: {
  tenantId: string;
  userId: string;
  type: string;
  campaignId: string;
  occurredOn: string;
  channel: string;
}): string {
  return [
    input.tenantId,
    input.userId,
    input.type,
    input.campaignId,
    input.occurredOn,
    input.channel,
  ].join(':');
}
