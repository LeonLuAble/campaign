import 'package:flutter/material.dart';

import '../tokens/colors.dart';
import '../tokens/radius.dart';
import '../tokens/typography.dart';
import 'app_tokens.dart';

/// Shared Material 3 theme for admin and mobile.
abstract final class AppTheme {
  static ThemeData light() {
    // Override on* roles that fail WCAG AA body contrast (≥ 4.5:1) fromSeed defaults.
    final scheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      secondary: AppColors.secondary,
      tertiary: AppColors.tertiary,
      surface: AppColors.surface,
      error: AppColors.error,
    ).copyWith(
      surface: AppColors.surface,
      onTertiary: const Color(0xFF1A1000),
    );

    final tokens = AppTokens.light(scheme);
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
    );

    return base.copyWith(
      textTheme: applyAppTypography(base.textTheme),
      primaryTextTheme: applyAppTypography(base.primaryTextTheme),
      extensions: <ThemeExtension<dynamic>>[tokens],
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        elevation: tokens.elevationFlat,
        scrolledUnderElevation: tokens.elevationRaised,
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: scheme.surfaceContainerLowest,
        indicatorColor: scheme.secondaryContainer,
        selectedIconTheme: IconThemeData(color: scheme.onSecondaryContainer),
        selectedLabelTextStyle: TextStyle(
          color: scheme.onSurface,
          fontWeight: FontWeight.w600,
          fontFamilyFallback: appFontFamilyFallback,
          height: appCjkBodyHeight,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: tokens.elevationFlat,
        color: scheme.surfaceContainerLowest,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.card),
          side: BorderSide(color: scheme.outlineVariant),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.input),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.chip),
        ),
      ),
    );
  }
}
