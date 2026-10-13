import { describe, expect, it } from 'vitest';
import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';
import {
  VegetarianRuleStrategy,
  normalizeVegetarianChoice,
} from './vegetarian-rules.js';

describe('vegetarian rules', () => {
  const rules = new VegetarianRuleStrategy();

  it('accepts the seven choice slugs and Chinese labels', () => {
    expect(normalizeVegetarianChoice('发愿素')).toBe('fa_yuan_su');
    expect(normalizeVegetarianChoice('yi_quan_su')).toBe('yi_quan_su');
    expect(() => normalizeVegetarianChoice('keto')).toThrow(
      InvalidRequestException,
    );
  });

  it('requires a vegetarian choice, days or meals, and a positive target', () => {
    expect(() =>
      rules.validateCommitment({
        typeKey: '发愿素',
        targetValue: 30,
        unit: 'days',
        payload: {},
      }),
    ).not.toThrow();
    expect(() =>
      rules.validateCommitment({
        typeKey: null,
        targetValue: 30,
        unit: 'days',
        payload: {},
      }),
    ).toThrow(InvalidRequestException);
    expect(() =>
      rules.validateCommitment({
        typeKey: 'fa_yuan_su',
        targetValue: 30,
        unit: 'steps',
        payload: {},
      }),
    ).toThrow(InvalidRequestException);
  });

  it('maps 已全素 progress to inclusive campaign days when dates exist', () => {
    const target = rules.resolveProgressTarget(
      {
        typeKey: 'yi_quan_su',
        targetValue: 1,
        unit: 'days',
        payload: {},
      },
      {
        startsOn: '2026-01-01',
        endsOn: '2026-01-31',
        timezone: 'Asia/Kuala_Lumpur',
      },
    );
    expect(target).toEqual({ targetValue: 31, unit: 'days' });
    expect(
      rules.contributeToProgress(
        { definitionUnit: 'days', quantity: 1, occurredOn: '2026-01-02' },
        {
          typeKey: 'fa_yuan_su',
          targetValue: 10,
          unit: 'days',
          payload: {},
        },
      ),
    ).toBe(1);
    expect(
      rules.contributeToProgress(
        { definitionUnit: 'meals', quantity: 3, occurredOn: '2026-01-02' },
        {
          typeKey: 'fa_yuan_su',
          targetValue: 10,
          unit: 'days',
          payload: {},
        },
      ),
    ).toBe(0);
  });

  it('limits vegetarian day quantity to 1 and meals to 1-3', () => {
    expect(() =>
      rules.validateAction({
        definitionKey: 'vegetarian_day',
        definitionUnit: 'days',
        quantity: 1,
        payload: {},
      }),
    ).not.toThrow();
    expect(() =>
      rules.validateAction({
        definitionKey: 'vegetarian_day',
        definitionUnit: 'days',
        quantity: 2,
        payload: {},
      }),
    ).toThrow(InvalidRequestException);
    expect(() =>
      rules.validateAction({
        definitionKey: 'vegetarian_meal',
        definitionUnit: 'meals',
        quantity: 3,
        payload: {},
      }),
    ).not.toThrow();
    expect(() =>
      rules.validateAction({
        definitionKey: 'vegetarian_meal',
        definitionUnit: 'meals',
        quantity: 4,
        payload: {},
      }),
    ).toThrow(InvalidRequestException);
  });
});
