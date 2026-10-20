import { describe, expect, it } from 'vitest';
import { batchState } from './batch-status.js';
import {
  addIsoDays,
  expandRange,
  rangeCoverage,
  type CoverageCommitment,
} from './day-coverage.js';

const periods = [
  { key: '2030-03-10', startsOn: '2030-03-01', endsOn: '2030-03-10', milestoneId: 'm-1' },
  { key: '2030-03-31', startsOn: '2030-03-11', endsOn: '2030-03-31', milestoneId: null },
];
const committed = (validFrom: string, validTo: string): CoverageCommitment => ({
  decision: 'committed',
  validFrom,
  validTo,
});

describe('rangeCoverage', () => {
  it('accepts a range inside one committed window', () => {
    expect(
      rangeCoverage(periods, [committed('2030-03-04', '2030-03-10')], '2030-03-04', '2030-03-10'),
    ).toEqual({ ok: true });
  });

  it('rejects a range across a period boundary', () => {
    expect(
      rangeCoverage(
        periods,
        [committed('2030-03-01', '2030-03-10'), committed('2030-03-11', '2030-03-31')],
        '2030-03-09',
        '2030-03-12',
      ),
    ).toEqual({ ok: false, code: 'RANGE_SPANS_PERIODS' });
  });

  it('rejects a range that starts before the commitment window', () => {
    expect(
      rangeCoverage(periods, [committed('2030-03-05', '2030-03-10')], '2030-03-03', '2030-03-06'),
    ).toEqual({ ok: false, code: 'RANGE_SPANS_PERIODS' });
  });

  it('needs a committed window covering the day', () => {
    expect(rangeCoverage(periods, [], '2030-03-04', '2030-03-04')).toEqual({
      ok: false,
      code: 'NO_COMMITMENT_FOR_DATE',
    });
    expect(
      rangeCoverage(
        periods,
        [{ decision: 'not_taking_part', validFrom: '2030-03-01', validTo: '2030-03-10' }],
        '2030-03-04',
        '2030-03-04',
      ),
    ).toEqual({ ok: false, code: 'NO_COMMITMENT_FOR_DATE' });
  });

  it('keeps legacy campaigns open unless the member is not taking part', () => {
    const whole = [{ key: '2030-03-31', startsOn: '2030-03-01', endsOn: '2030-03-31', milestoneId: null }];
    expect(rangeCoverage(whole, [], '2030-03-01', '2030-03-31')).toEqual({ ok: true });
    expect(
      rangeCoverage(
        whole,
        [{ decision: 'not_taking_part', validFrom: null, validTo: null }],
        '2030-03-02',
        '2030-03-02',
      ),
    ).toEqual({ ok: false, code: 'NO_COMMITMENT_FOR_DATE' });
  });
});

describe('range helpers', () => {
  it('expands inclusive ranges across month ends', () => {
    expect(addIsoDays('2030-02-27', 2)).toBe('2030-03-01');
    expect(expandRange('2030-12-30', 3)).toEqual(['2030-12-30', '2030-12-31', '2031-01-01']);
  });
});

describe('batchState', () => {
  it('derives a single status, mixed, and cancelled', () => {
    const approved = { cancelled: false, submissionStatus: 'approved' as const };
    const rejected = { cancelled: false, submissionStatus: 'rejected' as const };
    expect(batchState([approved, approved]).status).toBe('approved');
    expect(batchState([approved, rejected])).toMatchObject({
      status: 'mixed',
      cancelled: false,
      counts: { approved: 1, rejected: 1 },
    });
    expect(
      batchState([
        { ...approved, cancelled: true },
        { ...approved, cancelled: true },
      ]),
    ).toMatchObject({ status: 'approved', cancelled: true, counts: { cancelled: 2, approved: 0 } });
  });
});
