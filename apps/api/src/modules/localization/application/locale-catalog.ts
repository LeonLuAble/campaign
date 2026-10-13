import { InvalidRequestException } from '../../../shared/errors/domain-http.exceptions.js';

export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en', 'zh-Hans'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALES: ReadonlyArray<{
  code: SupportedLocale;
  name: string;
}> = [
  { code: 'en', name: 'English' },
  { code: 'zh-Hans', name: '简体中文' },
];

export type CampaignNotificationType =
  | 'campaign_started'
  | 'action_reminder'
  | 'milestone_achieved';

interface TemplatePair {
  title: string;
  body: string;
}

const NOTIFICATION_TEMPLATES: Record<
  SupportedLocale,
  Record<CampaignNotificationType, TemplatePair>
> = {
  en: {
    campaign_started: {
      title: 'Campaign started',
      body: '{campaignName} has started. You can begin recording actions.',
    },
    action_reminder: {
      title: 'Daily action reminder',
      body: 'You have not recorded an approved action for {campaignName} on {occurredOn}.',
    },
    milestone_achieved: {
      title: 'Milestone reached',
      body: '{campaignName} reached the {milestoneName} milestone.',
    },
  },
  'zh-Hans': {
    campaign_started: {
      title: '活动已开始',
      body: '{campaignName} 已开始。你可以开始记录行动。',
    },
    action_reminder: {
      title: '每日行动提醒',
      body: '你尚未为 {campaignName} 在 {occurredOn} 记录已核准的行动。',
    },
    milestone_achieved: {
      title: '已达成里程碑',
      body: '{campaignName} 已达成「{milestoneName}」里程碑。',
    },
  },
};

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function assertStoredLocale(value: string): SupportedLocale {
  const trimmed = value.trim();
  if (!isSupportedLocale(trimmed)) {
    throw new InvalidRequestException('locale must be one of: en, zh-Hans');
  }
  return trimmed;
}

export function resolveLocale(value: string | null | undefined): SupportedLocale {
  if (!value) {
    return DEFAULT_LOCALE;
  }
  const normalized = value.trim();
  if (isSupportedLocale(normalized)) {
    return normalized;
  }
  const language = normalized.split(/[-_]/)[0]?.toLowerCase();
  if (language === 'zh') {
    return 'zh-Hans';
  }
  if (language === 'en') {
    return 'en';
  }
  return DEFAULT_LOCALE;
}

export function interpolate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    return variables[key] ?? '';
  });
}

export function renderNotificationTemplate(
  locale: string | null | undefined,
  type: CampaignNotificationType,
  variables: Record<string, string>,
): { locale: SupportedLocale; title: string; body: string } {
  const resolved = resolveLocale(locale);
  const template = NOTIFICATION_TEMPLATES[resolved][type];
  return {
    locale: resolved,
    title: interpolate(template.title, variables),
    body: interpolate(template.body, variables),
  };
}

export function listTranslationRows(): Array<{
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
  for (const locale of SUPPORTED_LOCALES) {
    for (const type of Object.keys(
      NOTIFICATION_TEMPLATES[locale],
    ) as CampaignNotificationType[]) {
      const template = NOTIFICATION_TEMPLATES[locale][type];
      rows.push({
        locale,
        namespace: 'notifications',
        key: `${type}.title`,
        value: template.title,
      });
      rows.push({
        locale,
        namespace: 'notifications',
        key: `${type}.body`,
        value: template.body,
      });
    }
  }
  return rows;
}
