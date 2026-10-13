import { Module } from '@nestjs/common';
import {
  CAMPAIGN_RULE_STRATEGIES,
  type CampaignRuleStrategy,
} from '../campaigns/application/campaign-rule-strategy.js';
import { VegetarianRuleStrategy } from './application/vegetarian-rules.js';

@Module({
  providers: [
    VegetarianRuleStrategy,
    {
      provide: CAMPAIGN_RULE_STRATEGIES,
      useFactory: (
        vegetarian: VegetarianRuleStrategy,
      ): CampaignRuleStrategy[] => [vegetarian],
      inject: [VegetarianRuleStrategy],
    },
  ],
  exports: [CAMPAIGN_RULE_STRATEGIES, VegetarianRuleStrategy],
})
export class VegetarianModule {}
