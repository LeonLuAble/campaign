import { describe, expect, it } from 'vitest';
import {
  isSetupKeyConfigured,
  timingSafeEqualString,
} from './setup-key.js';

describe('setup-key', () => {
  describe('timingSafeEqualString', () => {
    it('returns true for identical strings', () => {
      expect(timingSafeEqualString('same-key-value', 'same-key-value')).toBe(
        true,
      );
    });

    it('returns false for different equal-length strings', () => {
      expect(timingSafeEqualString('abcdefgh', 'abcdefgH')).toBe(false);
    });

    it('returns false when lengths differ', () => {
      expect(timingSafeEqualString('short', 'much-longer-value')).toBe(false);
    });
  });

  describe('isSetupKeyConfigured', () => {
    it('is false when unset or empty', () => {
      expect(isSetupKeyConfigured(undefined)).toBe(false);
      expect(isSetupKeyConfigured('')).toBe(false);
    });

    it('is false when shorter than 32 characters', () => {
      expect(isSetupKeyConfigured('x'.repeat(31))).toBe(false);
    });

    it('is true when at least 32 characters', () => {
      expect(isSetupKeyConfigured('x'.repeat(32))).toBe(true);
    });
  });
});
