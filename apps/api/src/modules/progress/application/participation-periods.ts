import type {
  CampaignRuleStrategy,
  CommitmentRuleInput,
} from '../../campaigns/application/campaign-rule-strategy.js';
import { CommitmentDecision } from '../../commitments/domain/commitment.entity.js';
import {
  isPeriodised,
  periodForCommitment,
  periodStatus,
  type PeriodStatus,
} from '../../commitments/domain/commitment-periods.js';
import type { CampaignPeriod } from '../../milestones/domain/campaign-periods.js';

export type PeriodResultStatus =
  | 'awaiting'
  | 'submitted'
  | 'pending_review'
  | 'not_submitted'
  | 'not_applicable';

export interface PeriodCommitmentInput {
  id: string;
  decision: CommitmentDecision;
  typeKey: string | null;
  targetValue: number | null;
  unit: string | null;
  payload: Record<string, unknown>;
  validFrom: string | null;
  validTo: string | null;
}

/** One recorded (not cancelled) action and the state of its submission. */
export interface PeriodEntry {
  occurredOn: string;
  unit: string;
  quantity: number;
  submissionStatus: 'submitted' | 'approved' | 'rejected';
}

export interface ParticipationPeriod extends CampaignPeriod {
  status: PeriodStatus;
  decision: CommitmentDecision | null;
  commitment: {
    id: string;
    typeKey: string | null;
    targetValue: number;
    unit: string | null;
    validFrom: string | null;
    validTo: string | null;
  } | null;
  resultStatus: PeriodResultStatus;
  /** Distinct days with an entry that is not rejected. */
  coveredDays: number;
  approvedDays: number;
  achieved: number;
  target: number;
  unit: string | null;
}

/**
 * Per-period view of one participation. Entries count inside the commitment
 * window when committed, otherwise inside the period. `not_submitted` is a
 * display state only: the period is closed and holds no entries.
 */
export function computeParticipationPeriods(
  periods: CampaignPeriod[],
  commitments: PeriodCommitmentInput[],
  entries: PeriodEntry[],
  rules: CampaignRuleStrategy,
  context: { timezone: string; today: string },
): ParticipationPeriod[] {
  const periodised = isPeriodised(periods);
  return periods.map((period) => {
    const commitment = periodised
      ? (commitments.find(
          (row) =>
            row.validTo !== null &&
            periodForCommitment([period], row.validTo) !== null,
        ) ?? null)
      : (commitments.find((row) => row.validTo === null) ?? null);
    const status = periodStatus(period, context.today);
    const committed =
      commitment?.decision === CommitmentDecision.COMMITTED &&
      commitment.targetValue != null &&
      commitment.unit
        ? commitment
        : null;
    const windowFrom = committed?.validFrom ?? period.startsOn;
    const windowTo = committed?.validTo ?? period.endsOn;
    const inWindow = entries.filter(
      (entry) => entry.occurredOn >= windowFrom && entry.occurredOn <= windowTo,
    );
    const live = inWindow.filter((entry) => entry.submissionStatus !== 'rejected');
    const approved = inWindow.filter(
      (entry) => entry.submissionStatus === 'approved',
    );

    let achieved = 0;
    let target = 0;
    let unit: string | null = null;
    if (committed) {
      const input: CommitmentRuleInput = {
        typeKey: committed.typeKey,
        targetValue: committed.targetValue as number,
        unit: committed.unit as string,
        payload: committed.payload,
      };
      const resolved = rules.resolveProgressTarget(input, {
        startsOn: windowFrom,
        endsOn: windowTo,
        timezone: context.timezone,
      });
      target = resolved.targetValue;
      unit = resolved.unit;
      for (const entry of approved) {
        achieved += Math.max(
          0,
          rules.contributeToProgress(
            {
              definitionUnit: entry.unit,
              quantity: entry.quantity,
              occurredOn: entry.occurredOn,
            },
            input,
          ),
        );
      }
    }

    return {
      ...period,
      status,
      decision: commitment?.decision ?? null,
      commitment: commitment
        ? {
            id: commitment.id,
            typeKey: commitment.typeKey,
            targetValue: committed ? target : 0,
            unit: commitment.unit,
            validFrom: commitment.validFrom,
            validTo: commitment.validTo,
          }
        : null,
      resultStatus: resultStatusFor(commitment?.decision ?? null, status, live),
      coveredDays: new Set(live.map((entry) => entry.occurredOn)).size,
      approvedDays: new Set(approved.map((entry) => entry.occurredOn)).size,
      achieved,
      target,
      unit,
    };
  });
}

function resultStatusFor(
  decision: CommitmentDecision | null,
  status: PeriodStatus,
  live: PeriodEntry[],
): PeriodResultStatus {
  if (decision === CommitmentDecision.NOT_TAKING_PART) {
    return 'not_applicable';
  }
  if (live.length === 0) {
    return status === 'closed' ? 'not_submitted' : 'awaiting';
  }
  return live.some((entry) => entry.submissionStatus === 'submitted')
    ? 'pending_review'
    : 'submitted';
}
