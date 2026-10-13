import { describe, expect, it } from 'vitest';
import {
  applyFactor,
  computeMeasurements,
  computeOutcomes,
  computeTimeSeries,
  isDateInRange,
  periodBounds,
  rangesOverlap,
  selectEffectiveFactor,
  type ApprovedActionRow,
  type ImpactFactorRow,
  type MeasurementDefinitionRow,
} from './outcome-math.js';

const daysDefinition: MeasurementDefinitionRow = {
  id: 'def-days',
  key: 'vegetarian_days',
  sourceUnit: 'days',
  isActive: true,
};

const mealsDefinition: MeasurementDefinitionRow = {
  id: 'def-meals',
  key: 'vegetarian_meals',
  sourceUnit: 'meals',
  isActive: true,
};

function factor(
  overrides: Partial<ImpactFactorRow> &
    Pick<ImpactFactorRow, 'id' | 'outcomeMetric' | 'factorValue'>,
): ImpactFactorRow {
  return {
    campaignId: 'campaign-1',
    sourceUnit: 'days',
    outcomeUnit: 'kg',
    version: 1,
    source: 'Cited source',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    isActive: true,
    ...overrides,
  };
}

function action(overrides: Partial<ApprovedActionRow> = {}): ApprovedActionRow {
  return {
    participationId: 'p1',
    userId: 'u1',
    communityId: 'c1',
    sourceUnit: 'days',
    quantity: 1,
    occurredOn: '2026-10-12',
    ...overrides,
  };
}

describe('outcome math', () => {
  it('applies a configured factor without inventing a value', () => {
    expect(applyFactor(3, 2.5)).toBe(7.5);
  });

  it('treats effective_to as exclusive', () => {
    expect(isDateInRange('2026-03-01', '2026-01-01', '2026-03-01')).toBe(false);
    expect(isDateInRange('2026-02-28', '2026-01-01', '2026-03-01')).toBe(true);
  });

  it('detects overlapping effective ranges', () => {
    expect(rangesOverlap('2026-01-01', null, '2026-06-01', '2026-07-01')).toBe(
      true,
    );
    expect(rangesOverlap('2026-01-01', '2026-06-01', '2026-06-01', null)).toBe(
      false,
    );
  });

  it('prefers a campaign factor over a tenant-wide factor', () => {
    const selected = selectEffectiveFactor(
      [
        factor({
          id: 'tenant',
          campaignId: null,
          outcomeMetric: 'co2_kg',
          factorValue: 9,
        }),
        factor({
          id: 'campaign',
          campaignId: 'campaign-1',
          outcomeMetric: 'co2_kg',
          factorValue: 2,
          version: 2,
        }),
      ],
      'days',
      'co2_kg',
      '2026-10-12',
      'campaign-1',
    );
    expect(selected?.id).toBe('campaign');
  });

  it('uses the factor version that was effective on the action date', () => {
    const selected = selectEffectiveFactor(
      [
        factor({
          id: 'v1',
          outcomeMetric: 'co2_kg',
          factorValue: 1,
          version: 1,
          effectiveFrom: '2026-01-01',
          effectiveTo: '2026-06-01',
        }),
        factor({
          id: 'v2',
          outcomeMetric: 'co2_kg',
          factorValue: 4,
          version: 2,
          effectiveFrom: '2026-06-01',
          effectiveTo: null,
        }),
      ],
      'days',
      'co2_kg',
      '2026-05-31',
      'campaign-1',
    );
    expect(selected?.id).toBe('v1');
  });

  it('sums only defined source units from approved actions', () => {
    const totals = computeMeasurements(
      [
        action({ quantity: 2, occurredOn: '2026-10-11' }),
        action({ quantity: 1, occurredOn: '2026-10-12' }),
        action({ sourceUnit: 'meals', quantity: 3 }),
        action({ sourceUnit: 'hours', quantity: 8 }),
      ],
      [daysDefinition, mealsDefinition],
    );
    expect(totals).toEqual([
      expect.objectContaining({
        sourceUnit: 'days',
        quantity: 3,
        approvedActionCount: 2,
        distinctApprovedDays: 2,
      }),
      expect.objectContaining({
        sourceUnit: 'meals',
        quantity: 3,
        approvedActionCount: 1,
      }),
    ]);
  });

  it('returns no measurements when the campaign has no definitions', () => {
    expect(computeMeasurements([action()], [])).toEqual([]);
  });

  it('converts measurements with the cited factor version', () => {
    const outcomes = computeOutcomes(
      [
        action({ quantity: 2 }),
        action({ quantity: 3, occurredOn: '2026-10-13' }),
      ],
      [daysDefinition],
      [
        factor({
          id: 'co2',
          outcomeMetric: 'co2_kg',
          factorValue: 2,
          source: 'Internal citation',
        }),
      ],
      'campaign-1',
    );
    expect(outcomes).toEqual([
      expect.objectContaining({
        sourceUnit: 'days',
        outcomeMetric: 'co2_kg',
        outcomeUnit: 'kg',
        value: 10,
        sourceQuantity: 5,
      }),
    ]);
    expect(outcomes[0].contributions).toEqual([
      expect.objectContaining({
        impactFactorId: 'co2',
        version: 1,
        source: 'Internal citation',
        factorValue: 2,
      }),
    ]);
  });

  it('splits historical outcomes across factor versions', () => {
    const outcomes = computeOutcomes(
      [
        action({ quantity: 1, occurredOn: '2026-05-01' }),
        action({ quantity: 1, occurredOn: '2026-07-01' }),
      ],
      [daysDefinition],
      [
        factor({
          id: 'v1',
          outcomeMetric: 'co2_kg',
          factorValue: 1,
          version: 1,
          effectiveFrom: '2026-01-01',
          effectiveTo: '2026-06-01',
        }),
        factor({
          id: 'v2',
          outcomeMetric: 'co2_kg',
          factorValue: 10,
          version: 2,
          effectiveFrom: '2026-06-01',
          effectiveTo: null,
        }),
      ],
      'campaign-1',
    );
    expect(outcomes[0].value).toBe(11);
    expect(outcomes[0].contributions.map((row) => row.impactFactorId)).toEqual([
      'v1',
      'v2',
    ]);
  });

  it('groups time series by campaign-local ISO week starting Monday', () => {
    expect(periodBounds('2026-10-14', 'week')).toEqual({
      periodStart: '2026-10-12',
      periodEnd: '2026-10-18',
    });
    const series = computeTimeSeries(
      [
        action({ occurredOn: '2026-10-12' }),
        action({ occurredOn: '2026-10-14' }),
        action({ occurredOn: '2026-10-20' }),
      ],
      [daysDefinition],
      [
        factor({
          id: 'co2',
          outcomeMetric: 'co2_kg',
          factorValue: 2,
        }),
      ],
      'campaign-1',
      'Asia/Kuala_Lumpur',
      'week',
    );
    expect(series.points).toHaveLength(2);
    expect(series.points[0]).toMatchObject({
      periodStart: '2026-10-12',
      periodEnd: '2026-10-18',
    });
    expect(series.points[0].measurements[0].quantity).toBe(2);
    expect(series.points[0].outcomes[0].value).toBe(4);
    expect(series.points[1].periodStart).toBe('2026-10-19');
  });
});
