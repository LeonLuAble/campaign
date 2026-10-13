import type {
  CampaignRuleStrategy,
  CommitmentRuleInput,
  ProgressTargetContext,
} from '../../campaigns/application/campaign-rule-strategy.js';
import { toIsoDate } from '../../campaigns/application/timezone.js';
import {
  completionPercent,
  completionStatus,
  type CompletionStatus,
} from './completion.js';

export interface CountableAction {
  participationId: string;
  userId: string;
  communityId: string | null;
  unit: string;
  quantity: number;
  occurredOn: string;
}

export interface CountableCommitment {
  id: string;
  participationId: string;
  typeKey: string | null;
  targetValue: number;
  unit: string;
  payload: Record<string, unknown>;
}

export interface CountableParticipation {
  id: string;
  userId: string;
  communityId: string | null;
}

export interface UnitProgress {
  unit: string;
  achievedValue: number;
  targetValue: number;
  completionPercent: number | null;
  completionStatus: CompletionStatus;
  approvedActionCount: number;
  distinctApprovedDays: number;
  committedParticipantCount: number;
}

export interface ParticipantProgressSnapshot {
  participationId: string;
  userId: string;
  communityId: string | null;
  commitment: {
    id: string;
    typeKey: string | null;
    targetValue: number;
    unit: string;
  } | null;
  unit: string | null;
  achievedValue: number;
  targetValue: number;
  completionPercent: number | null;
  completionStatus: CompletionStatus;
  approvedActionCount: number;
  distinctApprovedDays: number;
  byUnit: UnitProgress[];
}

function commitmentInput(commitment: CountableCommitment): CommitmentRuleInput {
  return {
    typeKey: commitment.typeKey,
    targetValue: commitment.targetValue,
    unit: commitment.unit,
    payload: commitment.payload,
  };
}

function emptyUnit(unit: string): UnitProgress {
  return {
    unit,
    achievedValue: 0,
    targetValue: 0,
    completionPercent: null,
    completionStatus: 'none',
    approvedActionCount: 0,
    distinctApprovedDays: 0,
    committedParticipantCount: 0,
  };
}

function finalizeUnit(row: UnitProgress): UnitProgress {
  return {
    ...row,
    completionPercent: completionPercent(row.achievedValue, row.targetValue),
    completionStatus: completionStatus(row.achievedValue, row.targetValue),
  };
}

export function computeParticipantProgress(
  participation: CountableParticipation,
  commitment: CountableCommitment | null,
  actions: CountableAction[],
  rules: CampaignRuleStrategy,
  campaign: ProgressTargetContext,
): ParticipantProgressSnapshot {
  const ownActions = actions.filter(
    (action) => action.participationId === participation.id,
  );
  const prepared = commitment ? commitmentInput(commitment) : null;
  const target = prepared
    ? rules.resolveProgressTarget(prepared, campaign)
    : null;
  const primaryUnit = target?.unit ?? null;
  const days = new Set<string>();
  const byUnit = new Map<string, UnitProgress>();

  for (const action of ownActions) {
    const occurredOn = toIsoDate(action.occurredOn) ?? action.occurredOn;
    const contributed = rules.contributeToProgress(
      {
        definitionUnit: action.unit,
        quantity: action.quantity,
        occurredOn,
      },
      prepared,
    );
    const unit = prepared ? (primaryUnit ?? action.unit) : action.unit;
    if (contributed <= 0 && prepared) {
      continue;
    }
    const quantity = prepared ? contributed : action.quantity;
    if (quantity <= 0) {
      continue;
    }
    const row = byUnit.get(unit) ?? emptyUnit(unit);
    row.achievedValue += quantity;
    row.approvedActionCount += 1;
    days.add(`${unit}:${occurredOn}`);
    byUnit.set(unit, row);
  }

  if (target) {
    const row = byUnit.get(target.unit) ?? emptyUnit(target.unit);
    row.targetValue = target.targetValue;
    row.committedParticipantCount = 1;
    byUnit.set(target.unit, row);
  }

  for (const row of byUnit.values()) {
    const distinct = new Set<string>();
    for (const key of days) {
      if (key.startsWith(`${row.unit}:`)) {
        distinct.add(key);
      }
    }
    row.distinctApprovedDays = distinct.size;
  }

  const units = [...byUnit.values()]
    .map(finalizeUnit)
    .sort((left, right) => left.unit.localeCompare(right.unit));
  const primary =
    (primaryUnit ? units.find((row) => row.unit === primaryUnit) : undefined) ??
    (units.length === 1 ? units[0] : emptyUnit(primaryUnit ?? 'unknown'));
  const mixedWithoutCommitment = !primaryUnit && units.length !== 1;

  return {
    participationId: participation.id,
    userId: participation.userId,
    communityId: participation.communityId,
    commitment: commitment
      ? {
          id: commitment.id,
          typeKey: commitment.typeKey,
          targetValue: target?.targetValue ?? commitment.targetValue,
          unit: target?.unit ?? commitment.unit,
        }
      : null,
    unit: mixedWithoutCommitment ? null : (primaryUnit ?? primary.unit),
    achievedValue: mixedWithoutCommitment ? 0 : primary.achievedValue,
    targetValue: mixedWithoutCommitment ? 0 : primary.targetValue,
    completionPercent: mixedWithoutCommitment
      ? null
      : primary.completionPercent,
    completionStatus: mixedWithoutCommitment
      ? 'none'
      : primary.completionStatus,
    approvedActionCount: units.reduce(
      (sum, row) => sum + row.approvedActionCount,
      0,
    ),
    distinctApprovedDays: mixedWithoutCommitment
      ? units.reduce((sum, row) => sum + row.distinctApprovedDays, 0)
      : primary.distinctApprovedDays,
    byUnit: units,
  };
}

export function aggregateUnitProgress(
  snapshots: ParticipantProgressSnapshot[],
): UnitProgress[] {
  const byUnit = new Map<string, UnitProgress>();
  for (const snapshot of snapshots) {
    for (const row of snapshot.byUnit) {
      const current = byUnit.get(row.unit) ?? emptyUnit(row.unit);
      current.achievedValue += row.achievedValue;
      current.targetValue += row.targetValue;
      current.approvedActionCount += row.approvedActionCount;
      current.distinctApprovedDays += row.distinctApprovedDays;
      current.committedParticipantCount += row.committedParticipantCount;
      byUnit.set(row.unit, current);
    }
  }

  return [...byUnit.values()]
    .map(finalizeUnit)
    .sort((left, right) => left.unit.localeCompare(right.unit));
}
