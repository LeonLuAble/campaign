import { describe, expect, it } from 'vitest';
import { CommitmentDecision } from '../../commitments/domain/commitment.entity.js';
import { computeCampaignPeriods } from '../../milestones/domain/campaign-periods.js';
import { VegetarianRuleStrategy } from '../../vegetarian/application/vegetarian-rules.js';
import {
  computeParticipationPeriods,
  type PeriodCommitmentInput,
  type PeriodEntry,
} from './participation-periods.js';

const rules = new VegetarianRuleStrategy();
const periods = computeCampaignPeriods(
  { startsOn: '2030-03-01', endsOn: '2030-03-31' },
  [
    { id: 'm1', dueOn: '2030-03-10', name: 'One' },
    { id: 'm2', dueOn: '2030-03-20', name: 'Two' },
  ],
);
const context = { timezone: 'Asia/Kuala_Lumpur', today: '2030-03-15' };

function commitment(
  overrides: Partial<PeriodCommitmentInput>,
): PeriodCommitmentInput {
  return {
    id: 'c',
    decision: CommitmentDecision.COMMITTED,
    typeKey: 'fa_yuan_su',
    targetValue: 5,
    unit: 'days',
    payload: {},
    validFrom: '2030-03-01',
    validTo: '2030-03-10',
    ...overrides,
  };
}

function entry(overrides: Partial<PeriodEntry>): PeriodEntry {
  return {
    occurredOn: '2030-03-02',
    unit: 'days',
    quantity: 1,
    submissionStatus: 'approved',
    ...overrides,
  };
}

describe('computeParticipationPeriods', () => {
  it('derives status per period from the campaign-local day', () => {
    const rows = computeParticipationPeriods(periods, [], [], rules, context);
    expect(rows.map((row) => [row.key, row.status])).toEqual([
      ['2030-03-10', 'closed'],
      ['2030-03-20', 'open'],
      ['2030-03-31', 'upcoming'],
    ]);
  });

  it('marks a closed period without entries as not submitted, open as awaiting', () => {
    const rows = computeParticipationPeriods(
      periods,
      [commitment({ id: 'c1' })],
      [],
      rules,
      context,
    );
    expect(rows[0]).toMatchObject({
      decision: 'committed',
      resultStatus: 'not_submitted',
      target: 5,
      achieved: 0,
      unit: 'days',
    });
    expect(rows[1]).toMatchObject({ decision: null, resultStatus: 'awaiting' });
  });

  it('flips to submitted once a backfilled entry exists', () => {
    const rows = computeParticipationPeriods(
      periods,
      [commitment({ id: 'c1' })],
      [entry({ occurredOn: '2030-03-04' }), entry({ occurredOn: '2030-03-05' })],
      rules,
      context,
    );
    expect(rows[0]).toMatchObject({
      resultStatus: 'submitted',
      coveredDays: 2,
      approvedDays: 2,
      achieved: 2,
      commitment: { id: 'c1', targetValue: 5, validTo: '2030-03-10' },
    });
  });

  it('reports pending review while a submission awaits review', () => {
    const rows = computeParticipationPeriods(
      periods,
      [commitment({ id: 'c2', validFrom: '2030-03-11', validTo: '2030-03-20' })],
      [
        entry({ occurredOn: '2030-03-12' }),
        entry({ occurredOn: '2030-03-13', submissionStatus: 'submitted' }),
        entry({ occurredOn: '2030-03-14', submissionStatus: 'rejected' }),
      ],
      rules,
      context,
    );
    expect(rows[1]).toMatchObject({
      resultStatus: 'pending_review',
      coveredDays: 2,
      approvedDays: 1,
      achieved: 1,
    });
  });

  it('counts only entries inside the commitment window', () => {
    const rows = computeParticipationPeriods(
      periods,
      [commitment({ id: 'c2', validFrom: '2030-03-14', validTo: '2030-03-20' })],
      [entry({ occurredOn: '2030-03-12' }), entry({ occurredOn: '2030-03-15' })],
      rules,
      context,
    );
    expect(rows[1]).toMatchObject({ coveredDays: 1, achieved: 1 });
  });

  it('treats not taking part as not applicable with zero target', () => {
    const rows = computeParticipationPeriods(
      periods,
      [
        commitment({
          id: 'c3',
          decision: CommitmentDecision.NOT_TAKING_PART,
          typeKey: null,
          targetValue: 0,
          unit: null,
          validFrom: '2030-03-21',
          validTo: '2030-03-31',
        }),
      ],
      [],
      rules,
      { ...context, today: '2030-04-02' },
    );
    expect(rows[2]).toMatchObject({
      decision: 'not_taking_part',
      resultStatus: 'not_applicable',
      target: 0,
      achieved: 0,
      unit: null,
    });
  });

  it('resolves 已全素 to the commitment window day count', () => {
    const rows = computeParticipationPeriods(
      periods,
      [
        commitment({
          id: 'c4',
          typeKey: 'yi_quan_su',
          targetValue: 6,
          validFrom: '2030-03-15',
          validTo: '2030-03-20',
        }),
      ],
      [],
      rules,
      context,
    );
    expect(rows[1].target).toBe(6);
    expect(rows[1].commitment?.targetValue).toBe(6);
  });

  it('keeps one whole-campaign period for campaigns without dated milestones', () => {
    const whole = computeCampaignPeriods(
      { startsOn: '2030-03-01', endsOn: '2030-03-31' },
      [],
    );
    const rows = computeParticipationPeriods(
      whole,
      [
        commitment({
          id: 'legacy',
          typeKey: 'yi_quan_su',
          targetValue: 31,
          validFrom: null,
          validTo: null,
        }),
      ],
      [entry({ occurredOn: '2030-03-02' })],
      rules,
      context,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      key: '2030-03-31',
      status: 'open',
      decision: 'committed',
      target: 31,
      achieved: 1,
      resultStatus: 'submitted',
      commitment: { id: 'legacy', validFrom: null, validTo: null },
    });
  });
});
