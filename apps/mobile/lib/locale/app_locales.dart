import 'package:api_client/api_client.dart';
import 'package:flutter/widgets.dart';

class AppLocales {
  static const en = Locale('en');
  static const zhHans = Locale.fromSubtags(
    languageCode: 'zh',
    scriptCode: 'Hans',
  );

  static const supported = <Locale>[en, zhHans];

  static Locale fromApi(String? code) {
    return isChineseApiLocale(code) ? zhHans : en;
  }

  static String toApi(Locale locale) => toApiLocale(locale.toLanguageTag());
}
