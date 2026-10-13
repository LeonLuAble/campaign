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

export interface CampaignRuleStrategy {
  readonly key: string;
  validateCommitment(input: CommitmentRuleInput): void;
  validateAction(input: ActionRuleInput): void;
  normalizeCommitment?(input: CommitmentRuleInput): CommitmentRuleInput;
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
