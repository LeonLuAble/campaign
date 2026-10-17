import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type SupportedLocale,
} from './locale-catalog.js';

/** Pick the first supported locale from an Accept-Language header. */
export function matchAcceptLanguage(
  header: string | string[] | undefined | null,
): SupportedLocale {
  if (header == null) {
    return DEFAULT_LOCALE;
  }
  const raw = Array.isArray(header) ? header.join(',') : header;
  for (const part of raw.split(',')) {
    const tag = part.trim().split(';')[0]?.trim();
    if (!tag) {
      continue;
    }
    if (isSupportedLocale(tag)) {
      return tag;
    }
    const language = tag.split(/[-_]/)[0]?.toLowerCase();
    if (language === 'zh') {
      return 'zh-Hans';
    }
    if (language === 'en') {
      return 'en';
    }
  }
  return DEFAULT_LOCALE;
}
