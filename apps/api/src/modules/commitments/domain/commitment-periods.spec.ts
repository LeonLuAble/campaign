import { describe, expect, it } from 'vitest';
import {
  commitmentWindow,
  defaultPeriod,
  isPeriodised,
  periodForCommitment,
  periodStatus,
  targetExceedsWindow,
} from './commitment-periods.js';

const periods = [
  { key: '2030-03-10', startsOn: '2030-03-01', endsOn: '2030-03-10', milestoneId: 'm1' },
  { key: '2030-03-20', startsOn: '2030-03-11', endsOn: '2030-03-20', milestoneId: 'm2' },
  { key: '2030-03-31', startsOn: '2030-03-21', endsOn: '2030-03-31', milestoneId: null },
];

describe('commitment periods', () => {
  it('derives upcoming, open and closed from the campaign-local day', () => {
    expect(periodStatus(periods[1], '2030-03-10')).toBe('upcoming');
    expect(periodStatus(periods[1], '2030-03-11')).toBe('open');
    expect(periodStatus(periods[1], '2030-03-20')).toBe('open');
    expect(periodStatus(periods[1], '2030-03-21')).toBe('closed');
  });

  it('defaults to the first period before the campaign starts', () => {
    expect(defaultPeriod(periods, '2030-02-01')?.key).toBe('2030-03-10');
  });

  it('defaults to the period containing today, including due dates', () => {
    expect(defaultPeriod(periods, '2030-03-10')?.key).toBe('2030-03-10');
    expect(defaultPeriod(periods, '2030-03-11')?.key).toBe('2030-03-20');
    expect(defaultPeriod(periods, '2030-03-25')?.key).toBe('2030-03-31');
  });

  it('defaults to the last period after the campaign ends', () => {
    expect(defaultPeriod(periods, '2030-04-02')?.key).toBe('2030-03-31');
    expect(defaultPeriod([], '2030-04-02')).toBeNull();
  });

  it('starts the window today inside the period, or at the start when ahead', () => {
    expect(commitmentWindow(periods[1], '2030-03-15')).toEqual({
      validFrom: '2030-03-15',
      validTo: '2030-03-20',
      dayCount: 6,
    });
    expect(commitmentWindow(periods[1], '2030-03-02')).toEqual({
      validFrom: '2030-03-11',
      validTo: '2030-03-20',
      dayCount: 10,
    });
  });

  it('covers one day when choosing on the due date itself', () => {
    expect(commitmentWindow(periods[0], '2030-03-10')).toEqual({
      validFrom: '2030-03-10',
      validTo: '2030-03-10',
      dayCount: 1,
    });
  });

  it('caps days at the window and meals at three per day', () => {
    expect(targetExceedsWindow('days', 10, 10)).toBe(false);
    expect(targetExceedsWindow('days', 11, 10)).toBe(true);
    expect(targetExceedsWindow('meals', 30, 10)).toBe(false);
    expect(targetExceedsWindow('meals', 31, 10)).toBe(true);
    expect(targetExceedsWindow('km', 1_000, 1)).toBe(false);
  });

  it('only treats campaigns with dated milestones as periodised', () => {
    expect(isPeriodised(periods)).toBe(true);
    expect(isPeriodised([periods[2]])).toBe(false);
  });

  it('finds the period of a stored commitment by its end date', () => {
    expect(periodForCommitment(periods, '2030-03-20')?.key).toBe('2030-03-20');
    expect(periodForCommitment(periods, '2030-04-05')).toBeNull();
  });
});
