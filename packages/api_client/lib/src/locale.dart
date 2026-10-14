const kApiLocaleEn = 'en';
const kApiLocaleZhHans = 'zh-Hans';

const kSupportedApiLocales = <String>[kApiLocaleEn, kApiLocaleZhHans];

/// Maps any Chinese language tag (zh, zh-CN, zh_Hans, zh-Hans) to the API locale.
String toApiLocale(String? languageTag) {
  if (languageTag == null || languageTag.trim().isEmpty) {
    return kApiLocaleEn;
  }
  final normalized = languageTag.trim().replaceAll('_', '-');
  if (normalized == kApiLocaleZhHans ||
      normalized.toLowerCase().startsWith('zh')) {
    return kApiLocaleZhHans;
  }
  return kApiLocaleEn;
}

bool isChineseApiLocale(String? languageTag) =>
    toApiLocale(languageTag) == kApiLocaleZhHans;
