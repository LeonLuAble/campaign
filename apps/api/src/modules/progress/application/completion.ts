export type CompletionStatus =
  'none' | 'not_started' | 'in_progress' | 'achieved' | 'exceeded';

export function completionPercent(
  achievedValue: number,
  targetValue: number,
): number | null {
  if (targetValue <= 0) {
    return null;
  }
  return Math.round((achievedValue / targetValue) * 10000) / 100;
}

export function completionStatus(
  achievedValue: number,
  targetValue: number,
): CompletionStatus {
  if (targetValue <= 0) {
    return 'none';
  }
  if (achievedValue <= 0) {
    return 'not_started';
  }
  if (achievedValue < targetValue) {
    return 'in_progress';
  }
  if (achievedValue === targetValue) {
    return 'achieved';
  }
  return 'exceeded';
}

export function milestoneCrossed(
  metric: 'completion_percent' | 'achieved_value',
  thresholdValue: number,
  achievedValue: number,
  percent: number | null,
): boolean {
  if (metric === 'completion_percent') {
    return percent != null && percent >= thresholdValue;
  }
  return achievedValue >= thresholdValue;
}
