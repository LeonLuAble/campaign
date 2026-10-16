import 'package:flutter/material.dart';

/// CJK-safe font fallbacks (section 5.6). Prefer SC shapes even inside English UI.
const List<String> appFontFamilyFallback = [
  'PingFang SC',
  'Noto Sans SC',
  'Noto Sans CJK SC',
  'Microsoft YaHei',
  'sans-serif',
];

/// Minimum line height for CJK body text.
const double appCjkBodyHeight = 1.5;

TextTheme applyAppTypography(TextTheme base) {
  TextStyle? withFallback(TextStyle? style) {
    if (style == null) {
      return null;
    }
    final height = style.height;
    return style.copyWith(
      fontFamilyFallback: appFontFamilyFallback,
      height: height == null || height < appCjkBodyHeight
          ? appCjkBodyHeight
          : height,
      letterSpacing: 0,
    );
  }

  return base.copyWith(
    bodyLarge: withFallback(base.bodyLarge),
    bodyMedium: withFallback(base.bodyMedium),
    bodySmall: withFallback(base.bodySmall),
    titleLarge: withFallback(base.titleLarge),
    titleMedium: withFallback(base.titleMedium),
    titleSmall: withFallback(base.titleSmall),
    labelLarge: withFallback(base.labelLarge),
    labelMedium: withFallback(base.labelMedium),
    labelSmall: withFallback(base.labelSmall),
    headlineLarge: withFallback(base.headlineLarge),
    headlineMedium: withFallback(base.headlineMedium),
    headlineSmall: withFallback(base.headlineSmall),
    displayLarge: withFallback(base.displayLarge),
    displayMedium: withFallback(base.displayMedium),
    displaySmall: withFallback(base.displaySmall),
  );
}
