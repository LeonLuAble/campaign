import { describe, expect, it } from 'vitest';
import { defaultNotificationPreferences } from './notification-preferences.js';
import {
  deliveryDedupeKey,
  shouldSendActionReminder,
  type ReminderCandidate,
} from './reminder-eligibility.js';

const candidate: ReminderCandidate = {
  tenantId: 'tenant-1',
  campaignId: 'campaign-1',
  campaignName: '速素数数',
  campaignTimezone: 'Asia/Kuala_Lumpur',
  startsOn: '2026-01-01',
  endsOn: '2026-12-31',
  participationId: 'participation-1',
  userId: 'user-1',
  userTimezone: 'Asia/Kuala_Lumpur',
  engagement: 'taking_part',
};

describe('reminder eligibility', () => {
  it('sends after the local reminder time when no approved action exists', () => {
    const decision = shouldSendActionReminder({
      now: new Date('2026-10-13T01:05:00.000Z'),
      candidate,
      preferences: defaultNotificationPreferences('user-1'),
      hasApprovedActionToday: false,
    });
    expect(decision.eligible).toBe(true);
    expect(decision.occurredOn).toBe('2026-10-13');
  });

  it('skips when the user already recorded an approved action', () => {
    const decision = shouldSendActionReminder({
      now: new Date('2026-10-13T01:05:00.000Z'),
      candidate,
      preferences: defaultNotificationPreferences('user-1'),
      hasApprovedActionToday: true,
    });
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toBe('action_already_recorded');
  });

  it('skips when reminders are opted out', () => {
    const decision = shouldSendActionReminder({
      now: new Date('2026-10-13T01:05:00.000Z'),
      candidate,
      preferences: {
        ...defaultNotificationPreferences('user-1'),
        remindersEnabled: false,
      },
      hasApprovedActionToday: false,
    });
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toBe('reminders_disabled');
  });

  it('skips before the local reminder time', () => {
    const decision = shouldSendActionReminder({
      now: new Date('2026-10-12T16:00:00.000Z'),
      candidate,
      preferences: defaultNotificationPreferences('user-1'),
      hasApprovedActionToday: false,
    });
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toBe('before_local_reminder_time');
  });

  it('still reminds members who have not decided yet', () => {
    const decision = shouldSendActionReminder({
      now: new Date('2026-10-13T01:05:00.000Z'),
      candidate: { ...candidate, engagement: 'awaiting_commitment' },
      preferences: defaultNotificationPreferences('user-1'),
      hasApprovedActionToday: false,
    });
    expect(decision.eligible).toBe(true);
  });

  it.each([
    ['not_taking_part', 'not_taking_part'],
    ['withdrawn', 'withdrawn'],
  ] as const)('skips %s participants', (engagement, reason) => {
    const decision = shouldSendActionReminder({
      now: new Date('2026-10-13T01:05:00.000Z'),
      candidate: { ...candidate, engagement },
      preferences: defaultNotificationPreferences('user-1'),
      hasApprovedActionToday: false,
    });
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toBe(reason);
  });

  it('builds a stable per-channel dedupe key', () => {
    expect(
      deliveryDedupeKey({
        tenantId: 't',
        userId: 'u',
        type: 'action_reminder',
        campaignId: 'c',
        occurredOn: '2026-10-13',
        channel: 'email',
      }),
    ).toBe('t:u:action_reminder:c:2026-10-13:email');
  });
});
