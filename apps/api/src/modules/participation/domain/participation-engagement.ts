import { CommitmentDecision } from '../../commitments/domain/commitment.entity.js';
import { ParticipationStatus } from './participation.entity.js';

export type ParticipationEngagement =
  | 'awaiting_commitment'
  | 'taking_part'
  | 'not_taking_part'
  | 'withdrawn';

export interface ParticipationEngagementCounts {
  enrolled: number;
  awaitingCommitment: number;
  takingPart: number;
  notTakingPart: number;
  withdrawn: number;
}

export function deriveEngagement(
  status: ParticipationStatus,
  decision: CommitmentDecision | null,
): ParticipationEngagement {
  if (status === ParticipationStatus.WITHDRAWN) {
    return 'withdrawn';
  }
  if (decision === null) {
    return 'awaiting_commitment';
  }
  if (decision === CommitmentDecision.NOT_TAKING_PART) {
    return 'not_taking_part';
  }
  return 'taking_part';
}

export function countEngagements(
  engagements: Iterable<ParticipationEngagement>,
): ParticipationEngagementCounts {
  const counts: ParticipationEngagementCounts = {
    enrolled: 0,
    awaitingCommitment: 0,
    takingPart: 0,
    notTakingPart: 0,
    withdrawn: 0,
  };
  for (const engagement of engagements) {
    if (engagement === 'withdrawn') {
      counts.withdrawn += 1;
      continue;
    }
    counts.enrolled += 1;
    if (engagement === 'awaiting_commitment') {
      counts.awaitingCommitment += 1;
    } else if (engagement === 'taking_part') {
      counts.takingPart += 1;
    } else {
      counts.notTakingPart += 1;
    }
  }
  return counts;
}
