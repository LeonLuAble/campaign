import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Lightweight placeholder while content loads.
class LoadingSkeleton extends StatelessWidget {
  const LoadingSkeleton({
    this.lines = 3,
    this.widthFactor = 1,
    super.key,
  });

  final int lines;
  final double widthFactor;

  @override
  Widget build(BuildContext context) {
    final tokens = AppTokens.of(context);
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: List.generate(lines, (index) {
        final factor = (widthFactor - index * 0.15).clamp(0.35, 1.0);
        return Padding(
          padding: EdgeInsets.only(bottom: tokens.spaceSm),
          child: FractionallySizedBox(
            widthFactor: factor,
            child: Container(
              height: 12,
              decoration: BoxDecoration(
                color: scheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(tokens.radiusChip),
              ),
            ),
          ),
        );
      }),
    );
  }
}
