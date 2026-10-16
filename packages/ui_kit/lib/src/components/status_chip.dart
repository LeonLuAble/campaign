import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Status indicator: colour + icon + text (never colour alone).
class StatusChip extends StatelessWidget {
  const StatusChip({
    required this.label,
    required this.icon,
    this.color,
    this.backgroundColor,
    super.key,
  });

  final String label;
  final IconData icon;
  final Color? color;
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    final tokens = AppTokens.of(context);
    final scheme = Theme.of(context).colorScheme;
    final fg = color ?? scheme.primary;
    final bg = backgroundColor ?? scheme.primaryContainer;
    return Semantics(
      label: label,
      child: Chip(
        avatar: Icon(icon, size: 16, color: fg),
        label: Text(label),
        backgroundColor: bg,
        side: BorderSide(color: fg.withValues(alpha: 0.35)),
        padding: EdgeInsets.symmetric(horizontal: tokens.spaceXs),
        visualDensity: VisualDensity.compact,
      ),
    );
  }
}
