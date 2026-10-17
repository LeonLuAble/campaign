import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalizationService } from '../../localization/application/localization.service.js';
import { VegetarianRuleStrategy } from '../../vegetarian/application/vegetarian-rules.js';
import { CAMPAIGN_RULE_STRATEGIES } from './campaign-rule-strategy.js';
import { CampaignRuleStrategyCatalogService } from './campaign-rule-strategy-catalog.service.js';

describe('CampaignRuleStrategyCatalogService', () => {
  let service: CampaignRuleStrategyCatalogService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CampaignRuleStrategyCatalogService,
        {
          provide: LocalizationService,
          useValue: {
            resolveTranslation: vi.fn().mockResolvedValue(null),
          },
        },
        {
          provide: CAMPAIGN_RULE_STRATEGIES,
          useValue: [new VegetarianRuleStrategy()],
        },
      ],
    }).compile();
    service = module.get(CampaignRuleStrategyCatalogService);
  });

  it('lists generic and vegetarian strategies with localized copy and recommendations', async () => {
    const en = await service.list('en');
    expect(en.map((row) => row.key)).toEqual(['generic', 'vegetarian']);
    const vegetarian = en.find((row) => row.key === 'vegetarian');
    expect(vegetarian).toMatchObject({
      key: 'vegetarian',
      units: ['days', 'meals'],
      reviewModes: ['auto', 'manual'],
    });
    expect(vegetarian?.label).toContain('Vegetarian');
    expect(vegetarian?.recommendedActionDefinitions).toEqual([
      { key: 'vegetarian_day', unit: 'days', name: 'Vegetarian day' },
      { key: 'vegetarian_meal', unit: 'meals', name: 'Vegetarian meal' },
    ]);

    const zh = await service.list('zh-Hans');
    const vegetarianZh = zh.find((row) => row.key === 'vegetarian');
    expect(vegetarianZh?.label).toBe('速素数数');
    expect(vegetarianZh?.recommendedActionDefinitions[0]?.name).toBe('素食日');
  });

  it('does not embed vegetarian choice names on the generic strategy', async () => {
    const en = await service.list('en');
    const generic = en.find((row) => row.key === 'generic');
    expect(generic?.recommendedActionDefinitions).toEqual([]);
    expect(JSON.stringify(generic)).not.toContain('随缘素');
    expect(JSON.stringify(generic)).not.toContain('发愿素');
  });
});
