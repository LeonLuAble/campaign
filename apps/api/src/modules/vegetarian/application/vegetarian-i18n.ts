import type { SupportedLocale } from '../../localization/application/locale-catalog.js';
import { VEGETARIAN_CHOICES, VEGETARIAN_RULES_STRATEGY_KEY } from './vegetarian-rules.js';

export const VEGETARIAN_TRANSLATION_NAMESPACE = 'vegetarian';

export const VEGETARIAN_DAY_DEFINITION_KEY = 'vegetarian_day';
export const VEGETARIAN_MEAL_DEFINITION_KEY = 'vegetarian_meal';

type Catalog = Record<string, string>;

const STRATEGY_COPY: Record<SupportedLocale, Catalog> = {
  en: {
    'strategy.label': 'Vegetarian (速素数数)',
    'strategy.description':
      'Seven pledge choices with days and meals units for a vegetarian observance campaign.',
    [`actions.${VEGETARIAN_DAY_DEFINITION_KEY}.name`]: 'Vegetarian day',
    [`actions.${VEGETARIAN_MEAL_DEFINITION_KEY}.name`]: 'Vegetarian meal',
  },
  'zh-Hans': {
    'strategy.label': '速素数数',
    'strategy.description': '七种发愿选择，以「日」与「餐」为单位记录素食行动。',
    [`actions.${VEGETARIAN_DAY_DEFINITION_KEY}.name`]: '素食日',
    [`actions.${VEGETARIAN_MEAL_DEFINITION_KEY}.name`]: '素食餐',
  },
};

const CHOICE_COPY: Record<
  SupportedLocale,
  Record<string, { label: string; description: string }>
> = {
  en: {
    sui_yuan_su: {
      label: 'Sui Yuan Su',
      description: 'Join when you can; record vegetarian meals without a fixed target.',
    },
    huan_xi_su: {
      label: 'Huan Xi Su',
      description: 'Joyful vegetarian meals; set your own meal target.',
    },
    ding_ri_su: {
      label: 'Ding Ri Su',
      description: 'Fixed vegetarian days; set your own day target.',
    },
    yi_zhou_su: {
      label: 'Yi Zhou Su',
      description: 'One week of vegetarian days (suggested target: 7 days).',
    },
    quan_yue_su: {
      label: 'Quan Yue Su',
      description: 'A full month of vegetarian days (suggested target: 30 days).',
    },
    fa_yuan_su: {
      label: 'Fa Yuan Su',
      description: 'A personal vow; set your own day target.',
    },
    yi_quan_su: {
      label: 'Yi Quan Su',
      description: 'Fully vegetarian for the whole campaign duration.',
    },
  },
  'zh-Hans': {
    sui_yuan_su: {
      label: '随缘素',
      description: '随缘参与，以餐为单位记录，不设固定目标。',
    },
    huan_xi_su: {
      label: '欢喜素',
      description: '欢喜素食餐次，可自行设定餐数目标。',
    },
    ding_ri_su: {
      label: '定日素',
      description: '选定素食日，可自行设定天数目标。',
    },
    yi_zhou_su: {
      label: '一周素',
      description: '一周素食日（建议目标：7 天）。',
    },
    quan_yue_su: {
      label: '全月素',
      description: '全月素食日（建议目标：30 天）。',
    },
    fa_yuan_su: {
      label: '发愿素',
      description: '个人发愿，可自行设定天数目标。',
    },
    yi_quan_su: {
      label: '已全素',
      description: '活动期间全程素食（目标为活动天数）。',
    },
  },
};

export function listVegetarianTranslationRows(): Array<{
  locale: SupportedLocale;
  namespace: string;
  key: string;
  value: string;
}> {
  const rows: Array<{
    locale: SupportedLocale;
    namespace: string;
    key: string;
    value: string;
  }> = [];
  for (const locale of Object.keys(STRATEGY_COPY) as SupportedLocale[]) {
    for (const [key, value] of Object.entries(STRATEGY_COPY[locale])) {
      rows.push({
        locale,
        namespace: VEGETARIAN_TRANSLATION_NAMESPACE,
        key,
        value,
      });
    }
    for (const choice of VEGETARIAN_CHOICES) {
      const copy = CHOICE_COPY[locale][choice.key];
      rows.push({
        locale,
        namespace: VEGETARIAN_TRANSLATION_NAMESPACE,
        key: `choices.${choice.key}.label`,
        value: copy.label,
      });
      rows.push({
        locale,
        namespace: VEGETARIAN_TRANSLATION_NAMESPACE,
        key: `choices.${choice.key}.description`,
        value: copy.description,
      });
    }
  }
  return rows;
}

export function vegetarianTranslationFallback(
  locale: string,
  key: string,
): string | null {
  const resolved: SupportedLocale = locale === 'zh-Hans' ? 'zh-Hans' : 'en';
  const strategy = STRATEGY_COPY[resolved][key];
  if (strategy) {
    return strategy;
  }
  const choiceMatch = /^choices\.([^.]+)\.(label|description)$/.exec(key);
  if (choiceMatch) {
    const choiceKey = choiceMatch[1];
    const field = choiceMatch[2] as 'label' | 'description';
    return CHOICE_COPY[resolved][choiceKey]?.[field] ?? null;
  }
  return null;
}

export function vegetarianStrategyKey(): string {
  return VEGETARIAN_RULES_STRATEGY_KEY;
}
