import { describe, expect, it } from 'vitest';
import { isAuthRateLimitEnabled, parseCorsOrigins } from './security-config.js';

describe('parseCorsOrigins', () => {
  it('splits comma-separated origins and trims whitespace', () => {
    expect(
      parseCorsOrigins('https://admin.example.org, http://localhost:4173'),
    ).toEqual(['https://admin.example.org', 'http://localhost:4173']);
  });

  it('returns an empty list when unset or blank', () => {
    expect(parseCorsOrigins(undefined)).toEqual([]);
    expect(parseCorsOrigins('')).toEqual([]);
    expect(parseCorsOrigins('  , ')).toEqual([]);
  });
});

describe('isAuthRateLimitEnabled', () => {
  it('is off in test unless explicitly enabled', () => {
    expect(isAuthRateLimitEnabled('test', undefined)).toBe(false);
    expect(isAuthRateLimitEnabled('test', 'true')).toBe(true);
  });

  it('is on in development and production unless disabled', () => {
    expect(isAuthRateLimitEnabled('development', undefined)).toBe(true);
    expect(isAuthRateLimitEnabled('production', undefined)).toBe(true);
    expect(isAuthRateLimitEnabled('production', 'false')).toBe(false);
  });
});
