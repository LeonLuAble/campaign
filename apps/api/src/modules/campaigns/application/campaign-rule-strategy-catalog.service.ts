import { Inject, Injectable, Optional } from '@nestjs/common';
import type { SupportedLocale } from '../../localization/application/locale-catalog.js';
import { LocalizationService } from '../../localization/application/localization.service.js';
import {
  CAMPAIGN_RULE_STRATEGIES,
  GenericCampaignRules,
  type CampaignRuleStrategy,
} from './campaign-rule-strategy.js';

export interface CampaignRuleStrategyResponse {
  key: string;
  label: string;
  description: string;
  units: string[];
  reviewModes: Array<'auto' | 'manual'>;
  recommendedActionDefinitions: Array<{
    key: string;
    unit: string;
    name: string;
  }>;
}

@Injectable()
export class CampaignRuleStrategyCatalogService {
  private readonly genericRules = new GenericCampaignRules();

  constructor(
    private readonly localization: LocalizationService,
    @Optional()
    @Inject(CAMPAIGN_RULE_STRATEGIES)
    private readonly strategies: CampaignRuleStrategy[] | null,
  ) {}

  async list(locale: SupportedLocale): Promise<CampaignRuleStrategyResponse[]> {
    const registered = this.strategies ?? [];
    const all = [this.genericRules, ...registered];
    const seen = new Set<string>();
    const result: CampaignRuleStrategyResponse[] = [];
    for (const strategy of all) {
      if (seen.has(strategy.key)) {
        continue;
      }
      seen.add(strategy.key);
      result.push(await this.toResponse(strategy, locale));
    }
    return result;
  }

  private async toResponse(
    strategy: CampaignRuleStrategy,
    locale: SupportedLocale,
  ): Promise<CampaignRuleStrategyResponse> {
    const catalog = strategy.describeCatalog();
    const namespace = catalog.translationNamespace;
    const labelKey =
      namespace === 'campaigns'
        ? `strategies.${strategy.key}.label`
        : 'strategy.label';
    const descriptionKey =
      namespace === 'campaigns'
        ? `strategies.${strategy.key}.description`
        : 'strategy.description';

    const label =
      (await this.localization.resolveTranslation(locale, namespace, labelKey)) ??
      strategy.resolveLocalizedCopy?.(locale, labelKey) ??
      strategy.key;
    const description =
      (await this.localization.resolveTranslation(
        locale,
        namespace,
        descriptionKey,
      )) ??
      strategy.resolveLocalizedCopy?.(locale, descriptionKey) ??
      '';

    const recommendedActionDefinitions = [];
    for (const definition of catalog.recommendedActionDefinitions) {
      const nameKey = `actions.${definition.key}.name`;
      const name =
        (await this.localization.resolveTranslation(
          locale,
          namespace,
          nameKey,
        )) ??
        strategy.resolveLocalizedCopy?.(locale, nameKey) ??
        definition.key;
      recommendedActionDefinitions.push({
        key: definition.key,
        unit: definition.unit,
        name,
      });
    }

    return {
      key: strategy.key,
      label,
      description,
      units: catalog.units,
      reviewModes: catalog.reviewModes,
      recommendedActionDefinitions,
    };
  }
}
