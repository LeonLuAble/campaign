import { describe, expect, it } from 'vitest';
import {
  completionPercent,
  completionStatus,
  milestoneCrossed,
} from './completion.js';

describe('completion', () => {
  it('does not cap completion above 100 percent', () => {
    expect(completionPercent(15, 10)).toBe(150);
    expect(completionStatus(15, 10)).toBe('exceeded');
    expect(completionStatus(10, 10)).toBe('achieved');
    expect(completionStatus(3, 10)).toBe('in_progress');
    expect(completionStatus(0, 10)).toBe('not_started');
    expect(completionPercent(1, 0)).toBeNull();
    expect(completionStatus(1, 0)).toBe('none');
  });

  it('evaluates milestone thresholds without exposing ranking', () => {
    expect(milestoneCrossed('completion_percent', 50, 6, 60)).toBe(true);
    expect(milestoneCrossed('completion_percent', 50, 4, 40)).toBe(false);
    expect(milestoneCrossed('achieved_value', 10, 10, 100)).toBe(true);
    expect(milestoneCrossed('achieved_value', 10, 9, 90)).toBe(false);
  });
});
