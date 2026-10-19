import { inclusiveIsoDateCount } from '../../campaigns/application/timezone.js';

export type PeriodStatus = 'upcoming' | 'open' | 'closed';

export interface PeriodBounds {
  key: string;
  startsOn: string;
  endsOn: string;
  milestoneId: string | null;
}

export interface CommitmentWindow {
  validFrom: string;
  validTo: string;
  dayCount: number;
}

/** Meals per day the period cap allows (breakfast, lunch, dinner). */
export const MAX_MEALS_PER_DAY = 3;

/** `today` is the campaign-timezone calendar date. */
export function periodStatus(period: PeriodBounds, today: string): PeriodStatus {
  if (period.endsOn < today) {
    return 'closed';
  }
  if (period.startsOn > today) {
    return 'upcoming';
  }
  return 'open';
}

/**
 * True when dated milestones cut the campaign into more than the implicit
 * whole-campaign period. Campaigns without them keep whole-campaign
 * (NULL-window) commitments.
 */
export function isPeriodised(periods: PeriodBounds[]): boolean {
  return periods.some((period) => period.milestoneId !== null);
}

/**
 * The period containing today; the first period before the campaign starts;
 * the last period once the campaign window has passed.
 */
export function defaultPeriod<T extends PeriodBounds>(
  periods: T[],
  today: string,
): T | null {
  if (periods.length === 0) {
    return null;
  }
  const containing = periods.find(
    (period) => period.startsOn <= today && today <= period.endsOn,
  );
  if (containing) {
    return containing;
  }
  return today < periods[0].startsOn ? periods[0] : periods[periods.length - 1];
}

/**
 * The window a commitment chosen today covers: from today (clamped to the
 * period start, so choosing ahead starts on the period start) to the period
 * end. A closed period reports its full span.
 */
export function commitmentWindow(
  period: PeriodBounds,
  today: string,
): CommitmentWindow {
  const validFrom =
    today > period.startsOn && today <= period.endsOn ? today : period.startsOn;
  return {
    validFrom,
    validTo: period.endsOn,
    dayCount: inclusiveIsoDateCount(validFrom, period.endsOn),
  };
}

/** The period a stored commitment belongs to, tolerating an extended endsOn. */
export function periodForCommitment<T extends PeriodBounds>(
  periods: T[],
  validTo: string,
): T | null {
  return (
    periods.find(
      (period) => period.startsOn <= validTo && validTo <= period.endsOn,
    ) ?? null
  );
}

export function targetExceedsWindow(
  unit: string,
  targetValue: number,
  dayCount: number,
): boolean {
  if (unit === 'days') {
    return targetValue > dayCount;
  }
  if (unit === 'meals') {
    return targetValue > dayCount * MAX_MEALS_PER_DAY;
  }
  return false;
}

/**
 * One commitment per participation for callers that are not yet
 * period-aware: the whole-campaign row when present, otherwise the most
 * recently changed period row.
 */
export function representativeCommitments<
  T extends {
    participation_id: string;
    valid_to?: string | null;
    updated_at?: Date;
  },
>(rows: T[]): Map<string, T> {
  const result = new Map<string, T>();
  for (const row of rows) {
    const current = result.get(row.participation_id);
    if (!current) {
      result.set(row.participation_id, row);
      continue;
    }
    if (current.valid_to == null) {
      continue;
    }
    if (
      row.valid_to == null ||
      (row.updated_at?.getTime() ?? 0) > (current.updated_at?.getTime() ?? 0)
    ) {
      result.set(row.participation_id, row);
    }
  }
  return result;
}
