import { describe, expect, it } from 'vitest';
import { matchAcceptLanguage } from './accept-language.js';

describe('matchAcceptLanguage', () => {
  it('prefers an exact supported locale', () => {
    expect(matchAcceptLanguage('zh-Hans,en;q=0.8')).toBe('zh-Hans');
    expect(matchAcceptLanguage('en')).toBe('en');
  });

  it('maps zh* tags to zh-Hans and unknown tags to en', () => {
    expect(matchAcceptLanguage('zh-CN,zh;q=0.9')).toBe('zh-Hans');
    expect(matchAcceptLanguage('ms-MY,en;q=0.5')).toBe('en');
    expect(matchAcceptLanguage(undefined)).toBe('en');
  });
});
