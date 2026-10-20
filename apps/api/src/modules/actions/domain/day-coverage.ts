import {
  isPeriodised,
  type PeriodBounds,
} from '../../commitments/domain/commitment-periods.js';

export interface CoverageCommitment {
  decision: 'committed' | 'not_taking_part';
  validFrom: string | null;
  validTo: string | null;
}

export type CoverageResult =
  | { ok: true }
  | { ok: false; code: 'NO_COMMITMENT_FOR_DATE' | 'RANGE_SPANS_PERIODS' };

/**
 * Whether `[startOn, endOn]` may be recorded. Campaigns without dated
 * milestones only block a whole-campaign `not_taking_part` decision. In
 * periodised campaigns every day must sit in one period and one committed
 * commitment window: no covered day gives `NO_COMMITMENT_FOR_DATE`, a partly
 * covered range or one crossing a period boundary gives
 * `RANGE_SPANS_PERIODS`. A single day is `startOn === endOn`.
 */
export function rangeCoverage(
  periods: PeriodBounds[],
  commitments: CoverageCommitment[],
  startOn: string,
  endOn: string,
): CoverageResult {
  if (!isPeriodised(periods)) {
    const whole = commitments.find((row) => row.validTo === null);
    return whole?.decision === 'not_taking_part'
      ? { ok: false, code: 'NO_COMMITMENT_FOR_DATE' }
      : { ok: true };
  }
  const periodOf = (day: string) =>
    periods.find((period) => period.startsOn <= day && day <= period.endsOn) ??
    null;
  if (periodOf(startOn)?.key !== periodOf(endOn)?.key) {
    return { ok: false, code: 'RANGE_SPANS_PERIODS' };
  }
  const windowOf = (day: string) =>
    commitments.find(
      (row) =>
        row.decision === 'committed' &&
        row.validFrom !== null &&
        row.validTo !== null &&
        row.validFrom <= day &&
        day <= row.validTo,
    ) ?? null;
  const first = windowOf(startOn);
  const last = windowOf(endOn);
  if (!first && !last) {
    return { ok: false, code: 'NO_COMMITMENT_FOR_DATE' };
  }
  if (first !== last) {
    return { ok: false, code: 'RANGE_SPANS_PERIODS' };
  }
  return { ok: true };
}

/** `YYYY-MM-DD` plus `days` calendar days. */
export function addIsoDays(isoDate: string, days: number): string {
  const date = new Date(
    Date.UTC(
      Number(isoDate.slice(0, 4)),
      Number(isoDate.slice(5, 7)) - 1,
      Number(isoDate.slice(8, 10)) + days,
    ),
  );
  return date.toISOString().slice(0, 10);
}

/** Every day from `startOn`, `days` long, inclusive. */
export function expandRange(startOn: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => addIsoDays(startOn, index));
}
