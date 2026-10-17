import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';

export const CAMPAIGN_RULE_STRATEGIES = 'CAMPAIGN_RULE_STRATEGIES';
export const GENERIC_RULES_STRATEGY_KEY = 'generic';

export interface CommitmentRuleInput {
  typeKey: string | null;
  targetValue: number;
  unit: string;
  payload: Record<string, unknown>;
}

export interface ActionRuleInput {
  definitionKey: string;
  definitionUnit: string;
  quantity: number;
  payload: Record<string, unknown>;
}

export interface ProgressContributionInput {
  definitionUnit: string;
  quantity: number;
  occurredOn: string;
}

export interface ProgressTargetContext {
  startsOn: string | null;
  endsOn: string | null;
  timezone: string;
}

export interface ProgressTarget {
  targetValue: number;
  unit: string;
}

export interface CommitmentChoiceOption {
  key: string;
  name: string;
  canonicalUnit: string;
  suggestedTarget: number | null;
  usesCampaignDuration: boolean;
  /** Localized display label (Accept-Language). */
  label?: string;
  /** Localized one-line explanation (Accept-Language). */
  description?: string;
}

export interface CommitmentOptionsDescriptor {
  strategy: string;
  units: string[];
  choices: CommitmentChoiceOption[];
}

export type CampaignReviewMode = 'auto' | 'manual';

export interface RecommendedActionDefinition {
  key: string;
  unit: string;
}

export interface CampaignRuleStrategyCatalogDescriptor {
  key: string;
  units: string[];
  reviewModes: CampaignReviewMode[];
  recommendedActionDefinitions: RecommendedActionDefinition[];
  /** Translation namespace for label/description/action names. */
  translationNamespace: string;
}

export interface CampaignRuleStrategy {
  readonly key: string;
  validateCommitment(input: CommitmentRuleInput): void;
  validateAction(input: ActionRuleInput): void;
  normalizeCommitment?(input: CommitmentRuleInput): CommitmentRuleInput;
  describeCommitmentOptions(): CommitmentOptionsDescriptor;
  describeCatalog(): CampaignRuleStrategyCatalogDescriptor;
  /** Optional in-module fallback when translations table has no row. */
  resolveLocalizedCopy?(locale: string, key: string): string | null;
  contributeToProgress(
    contribution: ProgressContributionInput,
    commitment: CommitmentRuleInput | null,
  ): number;
  resolveProgressTarget(
    commitment: CommitmentRuleInput,
    campaign: ProgressTargetContext,
  ): ProgressTarget;
}

const MAX_TARGET = 100_000;
const MAX_QUANTITY = 10_000;

export class GenericCampaignRules implements CampaignRuleStrategy {
  readonly key = GENERIC_RULES_STRATEGY_KEY;

  validateCommitment(input: CommitmentRuleInput): void {
    assertPositiveInt('targetValue', input.targetValue, MAX_TARGET);
    assertNonBlank('unit', input.unit);
  }

  validateAction(input: ActionRuleInput): void {
    assertPositiveInt('quantity', input.quantity, MAX_QUANTITY);
    assertNonBlank('unit', input.definitionUnit);
  }

  describeCommitmentOptions(): CommitmentOptionsDescriptor {
    return {
      strategy: this.key,
      units: [],
      choices: [],
    };
  }

  describeCatalog(): CampaignRuleStrategyCatalogDescriptor {
    return {
      key: this.key,
      units: [],
      reviewModes: ['auto', 'manual'],
      recommendedActionDefinitions: [],
      translationNamespace: 'campaigns',
    };
  }

  contributeToProgress(
    contribution: ProgressContributionInput,
    commitment: CommitmentRuleInput | null,
  ): number {
    if (!commitment) {
      return contribution.quantity;
    }
    return contribution.definitionUnit === commitment.unit
      ? contribution.quantity
      : 0;
  }

  resolveProgressTarget(
    commitment: CommitmentRuleInput,
    campaign: ProgressTargetContext,
  ): ProgressTarget {
    void campaign;
    return {
      targetValue: commitment.targetValue,
      unit: commitment.unit,
    };
  }
}

export function resolveCampaignRules(
  configuration: Record<string, unknown>,
  strategies: readonly CampaignRuleStrategy[],
  generic: CampaignRuleStrategy,
): CampaignRuleStrategy {
  const raw = configuration.rulesStrategy;
  if (raw === undefined || raw === null || raw === '') {
    return generic;
  }
  if (typeof raw !== 'string') {
    throw new InvalidRequestException('rulesStrategy must be a string');
  }
  const key = raw.trim();
  if (!key || key === GENERIC_RULES_STRATEGY_KEY) {
    return generic;
  }
  const match = strategies.find((strategy) => strategy.key === key);
  if (!match) {
    throw new InvalidRequestException(
      `Unknown campaign rulesStrategy '${key}'`,
    );
  }
  return match;
}

function assertNonBlank(field: string, value: string): void {
  if (!value.trim()) {
    throw new InvalidRequestException(`${field} is required`);
  }
}

function assertPositiveInt(field: string, value: number, max: number): void {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new InvalidRequestException(
      `${field} must be an integer between 1 and ${max}`,
    );
  }
}
