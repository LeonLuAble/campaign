export type BatchStatus = 'submitted' | 'approved' | 'rejected' | 'mixed';

export interface BatchChild {
  cancelled: boolean;
  submissionStatus: 'submitted' | 'approved' | 'rejected' | null;
}

export interface BatchState {
  status: BatchStatus;
  cancelled: boolean;
  counts: {
    submitted: number;
    approved: number;
    rejected: number;
    cancelled: number;
  };
}

/**
 * Status from the child submissions of the days still recorded. Once every
 * day is cancelled the batch is `cancelled` and the status reflects the
 * submissions as they were.
 */
export function batchState(children: BatchChild[]): BatchState {
  const live = children.filter((child) => !child.cancelled);
  const basis = live.length > 0 ? live : children;
  const counts = { submitted: 0, approved: 0, rejected: 0, cancelled: 0 };
  counts.cancelled = children.length - live.length;
  for (const child of live) {
    counts[child.submissionStatus ?? 'submitted'] += 1;
  }
  const statuses = new Set(
    basis.map((child) => child.submissionStatus ?? 'submitted'),
  );
  const status: BatchStatus =
    statuses.size === 1 ? [...statuses][0] : statuses.size === 0 ? 'submitted' : 'mixed';
  return { status, cancelled: live.length === 0, counts };
}
