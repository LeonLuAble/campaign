import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

class MetricTile extends StatelessWidget {
  const MetricTile({
    required this.label,
    required this.value,
    this.caption,
    this.icon,
    super.key,
  });

  final String label;
  final String value;
  final String? caption;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final tokens = AppTokens.of(context);
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: EdgeInsets.all(tokens.spaceLg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 18, color: theme.colorScheme.primary),
                  SizedBox(width: tokens.spaceSm),
                ],
                Expanded(
                  child: Text(label, style: theme.textTheme.labelLarge),
                ),
              ],
            ),
            SizedBox(height: tokens.spaceSm),
            Text(value, style: theme.textTheme.headlineSmall),
            if (caption != null) ...[
              SizedBox(height: tokens.spaceXs),
              Text(
                caption!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.outline,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
