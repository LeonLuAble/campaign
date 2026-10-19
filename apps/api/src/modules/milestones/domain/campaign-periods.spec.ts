import { describe, expect, it } from 'vitest';
import { addIsoDays, computeCampaignPeriods } from './campaign-periods.js';

const window = { startsOn: '2026-11-01', endsOn: '2026-11-30' };

function milestone(id: string, dueOn: string) {
  return { id, dueOn, name: `M ${id}` };
}

describe('computeCampaignPeriods', () => {
  it('returns one whole-campaign period when there are no dated milestones', () => {
    expect(computeCampaignPeriods(window, [])).toEqual([
      {
        key: '2026-11-30',
        index: 0,
        startsOn: '2026-11-01',
        endsOn: '2026-11-30',
        milestoneId: null,
        name: null,
        isFinal: true,
        dayCount: 30,
      },
    ]);
  });

  it('splits at one milestone and adds an implicit final period on endsOn', () => {
    const periods = computeCampaignPeriods(window, [milestone('a', '2026-11-15')]);
    expect(periods).toEqual([
      {
        key: '2026-11-15',
        index: 0,
        startsOn: '2026-11-01',
        endsOn: '2026-11-15',
        milestoneId: 'a',
        name: 'M a',
        isFinal: false,
        dayCount: 15,
      },
      {
        key: '2026-11-30',
        index: 1,
        startsOn: '2026-11-16',
        endsOn: '2026-11-30',
        milestoneId: null,
        name: null,
        isFinal: true,
        dayCount: 15,
      },
    ]);
  });

  it('orders several milestones by date regardless of input order', () => {
    const periods = computeCampaignPeriods(window, [
      milestone('c', '2026-11-20'),
      milestone('a', '2026-11-05'),
      milestone('b', '2026-11-12'),
    ]);
    expect(
      periods.map((p) => [p.key, p.startsOn, p.endsOn, p.milestoneId, p.dayCount]),
    ).toEqual([
      ['2026-11-05', '2026-11-01', '2026-11-05', 'a', 5],
      ['2026-11-12', '2026-11-06', '2026-11-12', 'b', 7],
      ['2026-11-20', '2026-11-13', '2026-11-20', 'c', 8],
      ['2026-11-30', '2026-11-21', '2026-11-30', null, 10],
    ]);
    expect(periods.map((p) => p.index)).toEqual([0, 1, 2, 3]);
    expect(periods.map((p) => p.isFinal)).toEqual([false, false, false, true]);
  });

  it('uses a milestone on endsOn as the final period instead of adding one', () => {
    const periods = computeCampaignPeriods(window, [
      milestone('a', '2026-11-10'),
      milestone('end', '2026-11-30'),
    ]);
    expect(periods).toHaveLength(2);
    expect(periods[1]).toMatchObject({
      key: '2026-11-30',
      startsOn: '2026-11-11',
      milestoneId: 'end',
      name: 'M end',
      isFinal: true,
      dayCount: 20,
    });
  });

  it('treats a single milestone on endsOn as the whole campaign', () => {
    const periods = computeCampaignPeriods(window, [milestone('end', '2026-11-30')]);
    expect(periods).toHaveLength(1);
    expect(periods[0]).toMatchObject({
      startsOn: '2026-11-01',
      endsOn: '2026-11-30',
      milestoneId: 'end',
      isFinal: true,
      dayCount: 30,
    });
  });

  it('gives adjacent-day milestones one-day periods', () => {
    const periods = computeCampaignPeriods(window, [
      milestone('a', '2026-11-10'),
      milestone('b', '2026-11-11'),
      milestone('c', '2026-11-12'),
    ]);
    expect(
      periods.map((p) => [p.startsOn, p.endsOn, p.dayCount]),
    ).toEqual([
      ['2026-11-01', '2026-11-10', 10],
      ['2026-11-11', '2026-11-11', 1],
      ['2026-11-12', '2026-11-12', 1],
      ['2026-11-13', '2026-11-30', 18],
    ]);
  });

  it('gives a milestone on startsOn a one-day first period', () => {
    const periods = computeCampaignPeriods(window, [milestone('a', '2026-11-01')]);
    expect(periods[0]).toMatchObject({
      startsOn: '2026-11-01',
      endsOn: '2026-11-01',
      dayCount: 1,
    });
    expect(periods[1]).toMatchObject({ startsOn: '2026-11-02', dayCount: 29 });
  });

  it('handles a one-day campaign', () => {
    const periods = computeCampaignPeriods(
      { startsOn: '2026-11-01', endsOn: '2026-11-01' },
      [milestone('a', '2026-11-01')],
    );
    expect(periods).toEqual([
      expect.objectContaining({ key: '2026-11-01', dayCount: 1, isFinal: true }),
    ]);
  });

  it('covers every campaign day exactly once without gaps', () => {
    const periods = computeCampaignPeriods(window, [
      milestone('a', '2026-11-03'),
      milestone('b', '2026-11-04'),
      milestone('c', '2026-11-29'),
    ]);
    const total = periods.reduce((sum, p) => sum + p.dayCount, 0);
    expect(total).toBe(30);
    for (let i = 1; i < periods.length; i += 1) {
      expect(periods[i].startsOn).toBe(addIsoDays(periods[i - 1].endsOn, 1));
    }
    expect(periods[0].startsOn).toBe(window.startsOn);
    expect(periods.at(-1)?.endsOn).toBe(window.endsOn);
  });

  it('crosses month and leap-day boundaries', () => {
    const periods = computeCampaignPeriods(
      { startsOn: '2028-02-20', endsOn: '2028-03-10' },
      [milestone('a', '2028-02-29')],
    );
    expect(periods.map((p) => [p.startsOn, p.endsOn, p.dayCount])).toEqual([
      ['2028-02-20', '2028-02-29', 10],
      ['2028-03-01', '2028-03-10', 10],
    ]);
  });

  it('ignores milestones outside the window and repeated dates', () => {
    const periods = computeCampaignPeriods(window, [
      milestone('before', '2026-10-31'),
      milestone('after', '2026-12-01'),
      milestone('a', '2026-11-15'),
      milestone('dup', '2026-11-15'),
    ]);
    expect(periods.map((p) => p.milestoneId)).toEqual(['a', null]);
  });

  it('returns no periods while the campaign window is incomplete', () => {
    expect(computeCampaignPeriods({ startsOn: null, endsOn: '2026-11-30' }, [])).toEqual([]);
    expect(computeCampaignPeriods({ startsOn: '2026-11-01', endsOn: null }, [])).toEqual([]);
  });
});

describe('addIsoDays', () => {
  it('rolls over months and years', () => {
    expect(addIsoDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addIsoDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
