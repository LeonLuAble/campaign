import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Contrast ratio of [foreground] on [background] (≥ 1.0).
double contrastRatio(Color foreground, Color background) {
  final l1 = foreground.computeLuminance();
  final l2 = background.computeLuminance();
  final lighter = math.max(l1, l2);
  final darker = math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

bool meetsWcagAaBody(Color foreground, Color background) =>
    contrastRatio(foreground, background) >= 4.5;

bool meetsWcagAaLarge(Color foreground, Color background) =>
    contrastRatio(foreground, background) >= 3.0;
