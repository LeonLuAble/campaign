import { describe, expect, it } from 'vitest';
import { slugify } from './slugify.js';

describe('slugify', () => {
  it('normalizes latin names', () => {
    expect(slugify('  Tzu Chi Malaysia ')).toBe('tzu-chi-malaysia');
  });

  it('falls back when the name has no latin characters', () => {
    expect(slugify('慈济马来西亚', 'customer')).toBe('customer');
  });
});
