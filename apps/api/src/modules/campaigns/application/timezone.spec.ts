import { describe, expect, it } from 'vitest';
import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';
import {
  assertDateOrder,
  assertIanaTimeZone,
  assertOccurredOnInCampaignWindow,
  calendarDateInTimeZone,
  inclusiveIsoDateCount,
  normalizeSettings,
  parseIsoDate,
  resolveOccurredOn,
  toIsoDate,
} from './timezone.js';

describe('timezone and campaign value helpers', () => {
  it('accepts IANA time zones and rejects unknown values', () => {
    expect(assertIanaTimeZone('Asia/Kuala_Lumpur')).toBe('Asia/Kuala_Lumpur');
    expect(() => assertIanaTimeZone('Not/AZone')).toThrow(
      InvalidRequestException,
    );
  });

  it('parses calendar dates and rejects impossible days', () => {
    expect(parseIsoDate('2026-10-13', 'startsOn')).toBe('2026-10-13');
    expect(() => parseIsoDate('2026-13-01', 'startsOn')).toThrow(
      InvalidRequestException,
    );
    expect(() => parseIsoDate('2026-02-30', 'startsOn')).toThrow(
      InvalidRequestException,
    );
  });

  it('serializes date values as ISO calendar dates', () => {
    expect(toIsoDate('2026-01-02T00:00:00.000Z')).toBe('2026-01-02');
    expect(toIsoDate(new Date(Date.UTC(2026, 0, 2)))).toBe('2026-01-02');
    expect(toIsoDate(null)).toBeNull();
  });

  it('rejects endsOn before startsOn', () => {
    expect(() => assertDateOrder('2026-02-01', '2026-01-01')).toThrow(
      InvalidRequestException,
    );
    expect(() => assertDateOrder('2026-01-01', '2026-01-01')).not.toThrow();
  });

  it('accepts object configuration and rejects arrays', () => {
    expect(normalizeSettings({ reminderDay: 1 })).toEqual({ reminderDay: 1 });
    expect(normalizeSettings(null)).toEqual({});
    expect(() => normalizeSettings(['vegetarian'])).toThrow(
      InvalidRequestException,
    );
  });

  it('resolves campaign-local calendar dates around UTC midnight', () => {
    expect(
      calendarDateInTimeZone(
        new Date('2026-10-12T16:30:00.000Z'),
        'Asia/Kuala_Lumpur',
      ),
    ).toBe('2026-10-13');
    expect(
      calendarDateInTimeZone(
        new Date('2026-10-12T15:30:00.000Z'),
        'Asia/Kuala_Lumpur',
      ),
    ).toBe('2026-10-12');
  });

  it('defaults occurredOn to campaign-local today and rejects future dates', () => {
    const now = new Date('2026-10-13T02:00:00.000Z');
    expect(resolveOccurredOn(undefined, 'Asia/Kuala_Lumpur', now)).toBe(
      '2026-10-13',
    );
    expect(resolveOccurredOn('2026-10-12', 'Asia/Kuala_Lumpur', now)).toBe(
      '2026-10-12',
    );
    expect(() =>
      resolveOccurredOn('2026-10-14', 'Asia/Kuala_Lumpur', now),
    ).toThrow(InvalidRequestException);
  });

  it('keeps occurredOn inside the campaign window', () => {
    expect(() =>
      assertOccurredOnInCampaignWindow(
        '2026-01-01',
        '2026-02-01',
        '2026-12-31',
      ),
    ).toThrow(InvalidRequestException);
    expect(() =>
      assertOccurredOnInCampaignWindow(
        '2027-01-01',
        '2026-01-01',
        '2026-12-31',
      ),
    ).toThrow(InvalidRequestException);
    expect(() =>
      assertOccurredOnInCampaignWindow(
        '2026-06-01',
        '2026-01-01',
        '2026-12-31',
      ),
    ).not.toThrow();
  });

  it('counts inclusive campaign calendar days', () => {
    expect(inclusiveIsoDateCount('2026-01-01', '2026-01-01')).toBe(1);
    expect(inclusiveIsoDateCount('2026-01-01', '2026-01-31')).toBe(31);
  });
});
