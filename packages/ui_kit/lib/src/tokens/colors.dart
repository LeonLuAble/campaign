import 'package:flutter/material.dart';

/// Brand and semantic color seeds for [AppTheme].
abstract final class AppColors {
  static const Color primary = Color(0xFF1F4E79);
  static const Color secondary = Color(0xFF3F7D58);
  static const Color tertiary = Color(0xFFB7791F);
  static const Color surface = Color(0xFFFAFAF7);
  static const Color error = Color(0xFFB3261E);
  static const Color success = Color(0xFF2E7D32);
  static const Color warning = Color(0xFF8A6D00);

  /// Outline grey for zero progress (never red/orange for "behind").
  static const Color progressNone = Color(0xFF79747E);
}
