import { describe, expect, it } from 'vitest';
import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';
import { VegetarianRuleStrategy } from '../../vegetarian/application/vegetarian-rules.js';
import {
  GenericCampaignRules,
  resolveCampaignRules,
} from './campaign-rule-strategy.js';

describe('campaign rule strategies', () => {
  const generic = new GenericCampaignRules();
  const vegetarian = new VegetarianRuleStrategy();

  it('uses generic rules when no strategy is configured', () => {
    const rules = resolveCampaignRules({}, [vegetarian], generic);
    expect(rules.key).toBe('generic');
    expect(rules.describeCommitmentOptions()).toEqual({
      strategy: 'generic',
      units: [],
      choices: [],
    });
    expect(() =>
      rules.validateCommitment({
        typeKey: null,
        targetValue: 10,
        unit: 'days',
        payload: {},
      }),
    ).not.toThrow();
  });

  it('selects the vegetarian strategy from campaign configuration', () => {
    const rules = resolveCampaignRules(
      { rulesStrategy: 'vegetarian' },
      [vegetarian],
      generic,
    );
    expect(rules.key).toBe('vegetarian');
  });

  it('rejects an unknown rulesStrategy', () => {
    expect(() =>
      resolveCampaignRules({ rulesStrategy: 'keto' }, [vegetarian], generic),
    ).toThrow(InvalidRequestException);
  });

  it('counts only matching units toward a pledged target', () => {
    expect(
      generic.contributeToProgress(
        { definitionUnit: 'hours', quantity: 2, occurredOn: '2026-01-01' },
        { typeKey: null, targetValue: 5, unit: 'hours', payload: {} },
      ),
    ).toBe(2);
    expect(
      generic.contributeToProgress(
        { definitionUnit: 'days', quantity: 1, occurredOn: '2026-01-01' },
        { typeKey: null, targetValue: 5, unit: 'hours', payload: {} },
      ),
    ).toBe(0);
  });
});
