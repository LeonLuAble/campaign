import { toIsoDate } from '../../campaigns/application/timezone.js';

export type TimeSeriesGranularity = 'day' | 'week';

export interface ApprovedActionRow {
  participationId: string;
  userId: string;
  communityId: string | null;
  sourceUnit: string;
  quantity: number;
  occurredOn: string;
}

export interface MeasurementDefinitionRow {
  id: string;
  key: string;
  sourceUnit: string;
  isActive: boolean;
}

export interface ImpactFactorRow {
  id: string;
  campaignId: string | null;
  sourceUnit: string;
  outcomeMetric: string;
  outcomeUnit: string;
  factorValue: number;
  version: number;
  source: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface MeasurementTotal {
  sourceUnit: string;
  definitionId: string | null;
  definitionKey: string | null;
  quantity: number;
  approvedActionCount: number;
  distinctApprovedDays: number;
}

export interface OutcomeContribution {
  impactFactorId: string;
  campaignId: string | null;
  version: number;
  factorValue: number;
  outcomeUnit: string;
  source: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceQuantity: number;
  value: number;
}

export interface OutcomeTotal {
  sourceUnit: string;
  outcomeMetric: string;
  outcomeUnit: string;
  value: number;
  sourceQuantity: number;
  contributions: OutcomeContribution[];
}

export interface TimeSeriesPoint {
  periodStart: string;
  periodEnd: string;
  measurements: MeasurementTotal[];
  outcomes: OutcomeTotal[];
}

export interface TimeSeriesResult {
  granularity: TimeSeriesGranularity;
  timezone: string;
  points: TimeSeriesPoint[];
}

const MS_PER_DAY = 86_400_000;

export function applyFactor(quantity: number, factorValue: number): number {
  return Number((quantity * factorValue).toFixed(8));
}

export function roundOutcome(value: number): number {
  return Number(value.toFixed(8));
}

export function isDateInRange(
  occurredOn: string,
  effectiveFrom: string,
  effectiveTo: string | null,
): boolean {
  if (occurredOn < effectiveFrom) {
    return false;
  }
  if (effectiveTo != null && occurredOn >= effectiveTo) {
    return false;
  }
  return true;
}

export function rangesOverlap(
  fromA: string,
  toA: string | null,
  fromB: string,
  toB: string | null,
): boolean {
  const endA = toA ?? '9999-12-31';
  const endB = toB ?? '9999-12-31';
  return fromA < endB && fromB < endA;
}

export function selectEffectiveFactor(
  factors: ImpactFactorRow[],
  sourceUnit: string,
  outcomeMetric: string,
  occurredOn: string,
  campaignId: string,
): ImpactFactorRow | null {
  const matching = factors.filter(
    (factor) =>
      factor.isActive &&
      factor.sourceUnit === sourceUnit &&
      factor.outcomeMetric === outcomeMetric &&
      isDateInRange(occurredOn, factor.effectiveFrom, factor.effectiveTo),
  );
  const campaignScoped = matching.filter(
    (factor) => factor.campaignId === campaignId,
  );
  const pool =
    campaignScoped.length > 0
      ? campaignScoped
      : matching.filter((factor) => factor.campaignId == null);
  if (pool.length === 0) {
    return null;
  }
  return [...pool].sort((left, right) => right.version - left.version)[0];
}

export function listOutcomeMetrics(
  factors: ImpactFactorRow[],
  sourceUnit: string,
  campaignId: string,
): string[] {
  const metrics = new Set<string>();
  for (const factor of factors) {
    if (!factor.isActive || factor.sourceUnit !== sourceUnit) {
      continue;
    }
    if (factor.campaignId != null && factor.campaignId !== campaignId) {
      continue;
    }
    metrics.add(factor.outcomeMetric);
  }
  return [...metrics].sort((left, right) => left.localeCompare(right));
}

export function isoWeekStart(isoDate: string): string {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + diff);
  return toIsoDate(date) ?? isoDate;
}

export function addIsoDays(isoDate: string, days: number): string {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY);
  return toIsoDate(date) ?? isoDate;
}

export function periodBounds(
  occurredOn: string,
  granularity: TimeSeriesGranularity,
): { periodStart: string; periodEnd: string } {
  if (granularity === 'day') {
    return { periodStart: occurredOn, periodEnd: occurredOn };
  }
  const periodStart = isoWeekStart(occurredOn);
  return { periodStart, periodEnd: addIsoDays(periodStart, 6) };
}

function emptyMeasurement(
  sourceUnit: string,
  definition: MeasurementDefinitionRow | undefined,
): MeasurementTotal {
  return {
    sourceUnit,
    definitionId: definition?.id ?? null,
    definitionKey: definition?.key ?? null,
    quantity: 0,
    approvedActionCount: 0,
    distinctApprovedDays: 0,
  };
}

function addMeasurement(
  current: MeasurementTotal,
  quantity: number,
  occurredOn: string,
  days: Set<string>,
): MeasurementTotal {
  days.add(`${current.sourceUnit}:${occurredOn}`);
  return {
    ...current,
    quantity: current.quantity + quantity,
    approvedActionCount: current.approvedActionCount + 1,
    distinctApprovedDays: days.size,
  };
}

function finalizeOutcomes(
  contributions: Map<string, OutcomeContribution[]>,
): OutcomeTotal[] {
  const totals: OutcomeTotal[] = [];
  for (const [key, rows] of contributions) {
    const [sourceUnit, outcomeMetric] = key.split('\u0000');
    const first = rows[0];
    totals.push({
      sourceUnit,
      outcomeMetric,
      outcomeUnit: first.outcomeUnit,
      value: roundOutcome(rows.reduce((sum, row) => sum + row.value, 0)),
      sourceQuantity: rows.reduce((sum, row) => sum + row.sourceQuantity, 0),
      contributions: rows.sort((left, right) => left.version - right.version),
    });
  }
  return totals.sort((left, right) => {
    const unit = left.sourceUnit.localeCompare(right.sourceUnit);
    return unit !== 0
      ? unit
      : left.outcomeMetric.localeCompare(right.outcomeMetric);
  });
}

function addContribution(
  contributions: Map<string, OutcomeContribution[]>,
  factor: ImpactFactorRow,
  quantity: number,
): void {
  const key = `${factor.sourceUnit}\u0000${factor.outcomeMetric}`;
  const rows = contributions.get(key) ?? [];
  const existing = rows.find((row) => row.impactFactorId === factor.id);
  const value = applyFactor(quantity, factor.factorValue);
  if (existing) {
    existing.sourceQuantity += quantity;
    existing.value = roundOutcome(existing.value + value);
    contributions.set(key, rows);
    return;
  }
  rows.push({
    impactFactorId: factor.id,
    campaignId: factor.campaignId,
    version: factor.version,
    factorValue: factor.factorValue,
    outcomeUnit: factor.outcomeUnit,
    source: factor.source,
    effectiveFrom: factor.effectiveFrom,
    effectiveTo: factor.effectiveTo,
    sourceQuantity: quantity,
    value,
  });
  contributions.set(key, rows);
}

export function computeMeasurements(
  actions: ApprovedActionRow[],
  definitions: MeasurementDefinitionRow[],
): MeasurementTotal[] {
  const active = definitions.filter((definition) => definition.isActive);
  if (active.length === 0) {
    return [];
  }
  const byUnit = new Map(
    active.map((definition) => [definition.sourceUnit, definition]),
  );
  const totals = new Map<string, MeasurementTotal>();
  const days = new Map<string, Set<string>>();
  for (const action of actions) {
    const definition = byUnit.get(action.sourceUnit);
    if (!definition || action.quantity <= 0) {
      continue;
    }
    const daySet = days.get(action.sourceUnit) ?? new Set<string>();
    const current =
      totals.get(action.sourceUnit) ??
      emptyMeasurement(action.sourceUnit, definition);
    const occurredOn = toIsoDate(action.occurredOn) ?? action.occurredOn;
    totals.set(
      action.sourceUnit,
      addMeasurement(current, action.quantity, occurredOn, daySet),
    );
    days.set(action.sourceUnit, daySet);
  }
  return [...totals.values()].sort((left, right) =>
    left.sourceUnit.localeCompare(right.sourceUnit),
  );
}

export function computeOutcomes(
  actions: ApprovedActionRow[],
  definitions: MeasurementDefinitionRow[],
  factors: ImpactFactorRow[],
  campaignId: string,
): OutcomeTotal[] {
  const measurableUnits = new Set(
    definitions
      .filter((definition) => definition.isActive)
      .map((definition) => definition.sourceUnit),
  );
  if (measurableUnits.size === 0) {
    return [];
  }
  const contributions = new Map<string, OutcomeContribution[]>();
  for (const action of actions) {
    if (!measurableUnits.has(action.sourceUnit) || action.quantity <= 0) {
      continue;
    }
    const occurredOn = toIsoDate(action.occurredOn) ?? action.occurredOn;
    for (const metric of listOutcomeMetrics(
      factors,
      action.sourceUnit,
      campaignId,
    )) {
      const factor = selectEffectiveFactor(
        factors,
        action.sourceUnit,
        metric,
        occurredOn,
        campaignId,
      );
      if (!factor) {
        continue;
      }
      addContribution(contributions, factor, action.quantity);
    }
  }
  return finalizeOutcomes(contributions);
}

export function computeTimeSeries(
  actions: ApprovedActionRow[],
  definitions: MeasurementDefinitionRow[],
  factors: ImpactFactorRow[],
  campaignId: string,
  timezone: string,
  granularity: TimeSeriesGranularity,
): TimeSeriesResult {
  const groups = new Map<string, ApprovedActionRow[]>();
  for (const action of actions) {
    const occurredOn = toIsoDate(action.occurredOn) ?? action.occurredOn;
    const bounds = periodBounds(occurredOn, granularity);
    const key = `${bounds.periodStart}\u0000${bounds.periodEnd}`;
    const rows = groups.get(key) ?? [];
    rows.push({ ...action, occurredOn });
    groups.set(key, rows);
  }
  const points: TimeSeriesPoint[] = [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, rows]) => {
      const [periodStart, periodEnd] = key.split('\u0000');
      return {
        periodStart,
        periodEnd,
        measurements: computeMeasurements(rows, definitions),
        outcomes: computeOutcomes(rows, definitions, factors, campaignId),
      };
    })
    .filter(
      (point) => point.measurements.length > 0 || point.outcomes.length > 0,
    );
  return { granularity, timezone, points };
}
