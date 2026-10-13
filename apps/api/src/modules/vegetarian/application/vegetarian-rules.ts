import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';
import type {
  ActionRuleInput,
  CampaignRuleStrategy,
  CommitmentRuleInput,
  ProgressContributionInput,
  ProgressTarget,
  ProgressTargetContext,
} from '../../campaigns/application/campaign-rule-strategy.js';
import { inclusiveIsoDateCount } from '../../campaigns/application/timezone.js';

export const VEGETARIAN_RULES_STRATEGY_KEY = 'vegetarian';

export const VEGETARIAN_CHOICES = [
  { key: 'sui_yuan_su', name: '随缘素' },
  { key: 'huan_xi_su', name: '欢喜素' },
  { key: 'ding_ri_su', name: '定日素' },
  { key: 'yi_zhou_su', name: '一周素' },
  { key: 'quan_yue_su', name: '全月素' },
  { key: 'fa_yuan_su', name: '发愿素' },
  { key: 'yi_quan_su', name: '已全素' },
] as const;

const CHOICE_BY_KEY = new Map<string, string>();
for (const choice of VEGETARIAN_CHOICES) {
  CHOICE_BY_KEY.set(choice.key, choice.key);
  CHOICE_BY_KEY.set(choice.name, choice.key);
}

const VEGETARIAN_UNITS = new Set(['days', 'meals']);

export const VEGETARIAN_CHOICE_TARGETS = {
  sui_yuan_su: {
    canonicalUnit: 'meals',
    suggestedTarget: null,
    usesCampaignDuration: false,
  },
  huan_xi_su: {
    canonicalUnit: 'meals',
    suggestedTarget: null,
    usesCampaignDuration: false,
  },
  ding_ri_su: {
    canonicalUnit: 'days',
    suggestedTarget: null,
    usesCampaignDuration: false,
  },
  yi_zhou_su: {
    canonicalUnit: 'days',
    suggestedTarget: 7,
    usesCampaignDuration: false,
  },
  quan_yue_su: {
    canonicalUnit: 'days',
    suggestedTarget: 30,
    usesCampaignDuration: false,
  },
  fa_yuan_su: {
    canonicalUnit: 'days',
    suggestedTarget: null,
    usesCampaignDuration: false,
  },
  yi_quan_su: {
    canonicalUnit: 'days',
    suggestedTarget: null,
    usesCampaignDuration: true,
  },
} as const;

export function normalizeVegetarianChoice(typeKey: string): string {
  const normalized = CHOICE_BY_KEY.get(typeKey.trim());
  if (!normalized) {
    throw new InvalidRequestException(
      'typeKey must be one of the seven vegetarian choices',
    );
  }
  return normalized;
}

export class VegetarianRuleStrategy implements CampaignRuleStrategy {
  readonly key = VEGETARIAN_RULES_STRATEGY_KEY;

  validateCommitment(input: CommitmentRuleInput): void {
    this.normalizeCommitment(input);
    if (!VEGETARIAN_UNITS.has(input.unit.trim())) {
      throw new InvalidRequestException(
        'unit must be days or meals for vegetarian commitments',
      );
    }
    if (!Number.isInteger(input.targetValue) || input.targetValue < 1) {
      throw new InvalidRequestException(
        'targetValue must be a positive integer',
      );
    }
  }

  normalizeCommitment(input: CommitmentRuleInput): CommitmentRuleInput {
    if (!input.typeKey) {
      throw new InvalidRequestException(
        'typeKey is required for vegetarian commitments',
      );
    }
    return {
      ...input,
      typeKey: normalizeVegetarianChoice(input.typeKey),
      unit: input.unit.trim(),
    };
  }

  validateAction(input: ActionRuleInput): void {
    const unit = input.definitionUnit.trim();
    if (unit === 'days' && input.quantity !== 1) {
      throw new InvalidRequestException(
        'quantity must be 1 for a vegetarian day',
      );
    }
    if (unit === 'meals' && (input.quantity < 1 || input.quantity > 3)) {
      throw new InvalidRequestException(
        'quantity must be between 1 and 3 vegetarian meals',
      );
    }
    if (!Number.isInteger(input.quantity) || input.quantity < 1) {
      throw new InvalidRequestException('quantity must be a positive integer');
    }
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
    const choice = commitment.typeKey
      ? CHOICE_BY_KEY.get(commitment.typeKey.trim())
      : null;
    const spec = choice
      ? VEGETARIAN_CHOICE_TARGETS[
          choice as keyof typeof VEGETARIAN_CHOICE_TARGETS
        ]
      : null;
    if (
      spec?.usesCampaignDuration &&
      commitment.unit === 'days' &&
      campaign.startsOn &&
      campaign.endsOn
    ) {
      return {
        targetValue: inclusiveIsoDateCount(campaign.startsOn, campaign.endsOn),
        unit: 'days',
      };
    }
    return {
      targetValue: commitment.targetValue,
      unit: commitment.unit,
    };
  }
}
