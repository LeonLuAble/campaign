import { inclusiveIsoDateCount } from '../../campaigns/application/timezone.js';

export interface PeriodMilestone {
  id: string;
  dueOn: string;
  name: string;
}

export interface CampaignPeriod {
  /** The period's end date (`YYYY-MM-DD`); stable across renames. */
  key: string;
  index: number;
  startsOn: string;
  endsOn: string;
  milestoneId: string | null;
  name: string | null;
  isFinal: boolean;
  dayCount: number;
}

export function addIsoDays(value: string, days: number): string {
  const date = new Date(
    Date.UTC(
      Number(value.slice(0, 4)),
      Number(value.slice(5, 7)) - 1,
      Number(value.slice(8, 10)) + days,
    ),
  );
  return date.toISOString().slice(0, 10);
}

/**
 * Splits `[startsOn, endsOn]` at each dated milestone (pass active ones only).
 * Period i runs from the day after the previous due date (or startsOn) to its
 * due date. When no milestone sits on endsOn an implicit final period ends
 * there; with no dated milestones the whole campaign is one period. Returns
 * no periods while the campaign window is incomplete. Milestones outside the
 * window and repeated dates are ignored.
 */
export function computeCampaignPeriods(
  window: { startsOn: string | null; endsOn: string | null },
  milestones: PeriodMilestone[],
): CampaignPeriod[] {
  const { startsOn, endsOn } = window;
  if (!startsOn || !endsOn || endsOn < startsOn) {
    return [];
  }
  const seen = new Set<string>();
  const dated = milestones
    .filter((row) => row.dueOn >= startsOn && row.dueOn <= endsOn)
    .sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : 0))
    .filter((row) => {
      if (seen.has(row.dueOn)) {
        return false;
      }
      seen.add(row.dueOn);
      return true;
    });

  const bounds: Array<{ endsOn: string; milestone: PeriodMilestone | null }> =
    dated.map((milestone) => ({ endsOn: milestone.dueOn, milestone }));
  if (bounds.at(-1)?.endsOn !== endsOn) {
    bounds.push({ endsOn, milestone: null });
  }

  let nextStart = startsOn;
  return bounds.map((bound, index) => {
    const period: CampaignPeriod = {
      key: bound.endsOn,
      index,
      startsOn: nextStart,
      endsOn: bound.endsOn,
      milestoneId: bound.milestone?.id ?? null,
      name: bound.milestone?.name ?? null,
      isFinal: index === bounds.length - 1,
      dayCount: inclusiveIsoDateCount(nextStart, bound.endsOn),
    };
    nextStart = addIsoDays(bound.endsOn, 1);
    return period;
  });
}
