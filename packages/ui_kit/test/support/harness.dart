import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

Widget harness({
  required Locale locale,
  required double textScale,
  required Widget child,
}) {
  return MaterialApp(
    locale: locale,
    theme: AppTheme.light(),
    home: MediaQuery(
      data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
      child: Scaffold(
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400, maxHeight: 640),
            child: Padding(padding: const EdgeInsets.all(16), child: child),
          ),
        ),
      ),
    ),
  );
}

const List<({String name, Locale locale, double scale})> localeScaleCases = [
  (name: 'en_1x', locale: Locale('en'), scale: 1),
  (name: 'en_2x', locale: Locale('en'), scale: 2),
  (
    name: 'zh_1x',
    locale: Locale.fromSubtags(languageCode: 'zh', scriptCode: 'Hans'),
    scale: 1,
  ),
  (
    name: 'zh_2x',
    locale: Locale.fromSubtags(languageCode: 'zh', scriptCode: 'Hans'),
    scale: 2,
  ),
];

bool isZh(Locale locale) => locale.languageCode == 'zh';
