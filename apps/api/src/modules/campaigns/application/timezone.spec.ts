import { describe, expect, it } from 'vitest';
import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';
import {
  assertDateOrder,
  assertIanaTimeZone,
  normalizeSettings,
  parseIsoDate,
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
});
