import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

class ErrorState extends StatelessWidget {
  const ErrorState({
    required this.message,
    this.onRetry,
    this.retryLabel = 'Retry',
    this.correlationId,
    super.key,
  });

  final String message;
  final VoidCallback? onRetry;
  final String retryLabel;
  final String? correlationId;

  @override
  Widget build(BuildContext context) {
    final tokens = AppTokens.of(context);
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: EdgeInsets.all(tokens.spaceXl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 40, color: theme.colorScheme.error),
            SizedBox(height: tokens.spaceMd),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyLarge,
            ),
            if (correlationId != null && correlationId!.isNotEmpty) ...[
              SizedBox(height: tokens.spaceSm),
              Text(
                correlationId!,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.outline,
                ),
              ),
            ],
            if (onRetry != null) ...[
              SizedBox(height: tokens.spaceLg),
              FilledButton(onPressed: onRetry, child: Text(retryLabel)),
            ],
          ],
        ),
      ),
    );
  }
}
