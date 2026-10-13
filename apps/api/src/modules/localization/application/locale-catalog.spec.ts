import { describe, expect, it } from 'vitest';
import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';
import {
  assertStoredLocale,
  renderNotificationTemplate,
  resolveLocale,
} from './locale-catalog.js';

describe('locale catalog', () => {
  it('stores only en and zh-Hans', () => {
    expect(assertStoredLocale('en')).toBe('en');
    expect(assertStoredLocale('zh-Hans')).toBe('zh-Hans');
    expect(() => assertStoredLocale('ms')).toThrow(InvalidRequestException);
  });

  it('maps Chinese language tags to zh-Hans at read time', () => {
    expect(resolveLocale('zh')).toBe('zh-Hans');
    expect(resolveLocale('zh-CN')).toBe('zh-Hans');
    expect(resolveLocale(null)).toBe('en');
    expect(resolveLocale('ms')).toBe('en');
  });

  it('renders campaign notification templates in the user locale', () => {
    const english = renderNotificationTemplate('en', 'campaign_started', {
      campaignName: '速素数数',
    });
    expect(english.title).toBe('Campaign started');
    expect(english.body).toContain('速素数数');

    const chinese = renderNotificationTemplate('zh', 'action_reminder', {
      campaignName: '速素数数',
      occurredOn: '2026-10-13',
    });
    expect(chinese.locale).toBe('zh-Hans');
    expect(chinese.title).toBe('每日行动提醒');
    expect(chinese.body).toContain('2026-10-13');
  });
});
