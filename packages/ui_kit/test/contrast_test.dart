import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_kit/src/theme/contrast.dart';
import 'package:ui_kit/ui_kit.dart';

void main() {
  test('AppTheme light token pairs meet WCAG AA contrast', () {
    final theme = AppTheme.light();
    final scheme = theme.colorScheme;
    final tokens = theme.extension<AppTokens>()!;

    final bodyPairs = <(Color, Color, String)>[
      (scheme.onSurface, scheme.surface, 'onSurface / surface'),
      (scheme.onPrimary, scheme.primary, 'onPrimary / primary'),
      (scheme.onSecondary, scheme.secondary, 'onSecondary / secondary'),
      (scheme.onTertiary, scheme.tertiary, 'onTertiary / tertiary'),
      (scheme.onError, scheme.error, 'onError / error'),
      (scheme.onPrimaryContainer, scheme.primaryContainer, 'primary container'),
      (
        scheme.onSecondaryContainer,
        scheme.secondaryContainer,
        'secondary container',
      ),
    ];

    for (final pair in bodyPairs) {
      final ratio = contrastRatio(pair.$1, pair.$2);
      expect(
        meetsWcagAaBody(pair.$1, pair.$2),
        isTrue,
        reason: '${pair.$3} body contrast was $ratio (need ≥ 4.5)',
      );
    }

    final largePairs = <(Color, Color, String)>[
      (tokens.progress.achieved, scheme.surface, 'progressAchieved / surface'),
      (tokens.progress.exceeded, scheme.surface, 'progressExceeded / surface'),
      (tokens.success, scheme.surface, 'success / surface'),
      (scheme.primary, scheme.surface, 'primary / surface'),
    ];

    for (final pair in largePairs) {
      final ratio = contrastRatio(pair.$1, pair.$2);
      expect(
        meetsWcagAaLarge(pair.$1, pair.$2),
        isTrue,
        reason: '${pair.$3} large-text contrast was $ratio (need ≥ 3.0)',
      );
    }
  });
}
