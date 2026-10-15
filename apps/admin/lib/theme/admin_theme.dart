import 'package:flutter/material.dart';

ThemeData buildAdminTheme() {
  const seed = Color(0xFF1F4E79);
  final scheme = ColorScheme.fromSeed(seedColor: seed);
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    appBarTheme: AppBarTheme(
      backgroundColor: scheme.surface,
      foregroundColor: scheme.onSurface,
      elevation: 0,
      scrolledUnderElevation: 1,
    ),
    navigationRailTheme: NavigationRailThemeData(
      backgroundColor: scheme.surfaceContainerLowest,
      indicatorColor: scheme.secondaryContainer,
      selectedIconTheme: IconThemeData(color: scheme.onSecondaryContainer),
      selectedLabelTextStyle: TextStyle(
        color: scheme.onSurface,
        fontWeight: FontWeight.w600,
      ),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: scheme.surfaceContainerLowest,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: scheme.outlineVariant),
      ),
    ),
    inputDecorationTheme: const InputDecorationTheme(
      border: OutlineInputBorder(),
    ),
  );
}
