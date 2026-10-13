import { describe, expect, it } from 'vitest';
import { GenericCampaignRules } from '../../campaigns/application/campaign-rule-strategy.js';
import { VegetarianRuleStrategy } from '../../vegetarian/application/vegetarian-rules.js';
import {
  aggregateUnitProgress,
  computeParticipantProgress,
  type CountableAction,
  type CountableCommitment,
  type CountableParticipation,
} from './progress-math.js';

const participation: CountableParticipation = {
  id: 'p1',
  userId: 'u1',
  communityId: 'c1',
};

const campaign = {
  startsOn: '2026-01-01',
  endsOn: '2026-01-31',
  timezone: 'Asia/Kuala_Lumpur',
};

function action(overrides: Partial<CountableAction> = {}): CountableAction {
  return {
    participationId: 'p1',
    userId: 'u1',
    communityId: 'c1',
    unit: 'days',
    quantity: 1,
    occurredOn: '2026-01-02',
    ...overrides,
  };
}

describe('progress math', () => {
  const vegetarian = new VegetarianRuleStrategy();
  const generic = new GenericCampaignRules();

  it('counts only matching-unit approved quantity against the pledge', () => {
    const commitment: CountableCommitment = {
      id: 'k1',
      participationId: 'p1',
      typeKey: 'fa_yuan_su',
      targetValue: 10,
      unit: 'days',
      payload: {},
    };
    const snapshot = computeParticipantProgress(
      participation,
      commitment,
      [
        action({ occurredOn: '2026-01-02' }),
        action({ occurredOn: '2026-01-03' }),
        action({ unit: 'meals', quantity: 3, occurredOn: '2026-01-04' }),
      ],
      vegetarian,
      campaign,
    );
    expect(snapshot.achievedValue).toBe(2);
    expect(snapshot.targetValue).toBe(10);
    expect(snapshot.completionPercent).toBe(20);
    expect(snapshot.completionStatus).toBe('in_progress');
    expect(snapshot.approvedActionCount).toBe(2);
  });

  it('drops rejected or cancelled rows because they never reach the countable set', () => {
    const commitment: CountableCommitment = {
      id: 'k1',
      participationId: 'p1',
      typeKey: 'fa_yuan_su',
      targetValue: 2,
      unit: 'days',
      payload: {},
    };
    const before = computeParticipantProgress(
      participation,
      commitment,
      [
        action({ occurredOn: '2026-01-02' }),
        action({ occurredOn: '2026-01-03' }),
      ],
      vegetarian,
      campaign,
    );
    expect(before.achievedValue).toBe(2);
    expect(before.completionStatus).toBe('achieved');

    const afterReject = computeParticipantProgress(
      participation,
      commitment,
      [action({ occurredOn: '2026-01-02' })],
      vegetarian,
      campaign,
    );
    expect(afterReject.achievedValue).toBe(1);
    expect(afterReject.completionStatus).toBe('in_progress');
  });

  it('uses campaign duration as the 已全素 target when dates exist', () => {
    const snapshot = computeParticipantProgress(
      participation,
      {
        id: 'k1',
        participationId: 'p1',
        typeKey: 'yi_quan_su',
        targetValue: 1,
        unit: 'days',
        payload: {},
      },
      [action()],
      vegetarian,
      campaign,
    );
    expect(snapshot.targetValue).toBe(31);
    expect(snapshot.commitment?.unit).toBe('days');
  });

  it('aggregates community or campaign totals without participant identifiers', () => {
    const first = computeParticipantProgress(
      participation,
      {
        id: 'k1',
        participationId: 'p1',
        typeKey: 'fa_yuan_su',
        targetValue: 10,
        unit: 'days',
        payload: {},
      },
      [action(), action({ occurredOn: '2026-01-03' })],
      vegetarian,
      campaign,
    );
    const second = computeParticipantProgress(
      { id: 'p2', userId: 'u2', communityId: 'c1' },
      {
        id: 'k2',
        participationId: 'p2',
        typeKey: 'fa_yuan_su',
        targetValue: 10,
        unit: 'days',
        payload: {},
      },
      [
        action({
          participationId: 'p2',
          userId: 'u2',
          occurredOn: '2026-01-02',
        }),
      ],
      vegetarian,
      campaign,
    );
    const totals = aggregateUnitProgress([first, second]);
    expect(totals).toEqual([
      expect.objectContaining({
        unit: 'days',
        achievedValue: 3,
        targetValue: 20,
        completionPercent: 15,
        committedParticipantCount: 2,
      }),
    ]);
    expect(JSON.stringify(totals)).not.toContain('u1');
    expect(JSON.stringify(totals)).not.toContain('p1');
  });

  it('lets generic campaigns count matching units from the pledge', () => {
    const snapshot = computeParticipantProgress(
      participation,
      {
        id: 'k1',
        participationId: 'p1',
        typeKey: null,
        targetValue: 5,
        unit: 'hours',
        payload: {},
      },
      [action({ unit: 'hours', quantity: 2 })],
      generic,
      campaign,
    );
    expect(snapshot.achievedValue).toBe(2);
    expect(snapshot.completionPercent).toBe(40);
  });
});
