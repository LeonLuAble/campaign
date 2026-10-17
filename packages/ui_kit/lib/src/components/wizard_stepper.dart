import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// Multi-step wizard chrome with a sticky footer (Back / Next).
///
/// Labels are constructor parameters — do not embed l10n here.
class WizardStepper extends StatelessWidget {
  const WizardStepper({
    required this.steps,
    required this.currentStep,
    required this.body,
    required this.nextLabel,
    required this.onNext,
    this.backLabel,
    this.onBack,
    this.nextEnabled = true,
    this.busy = false,
    this.showFooter = true,
    super.key,
  });

  final List<String> steps;
  final int currentStep;
  final Widget body;
  final String nextLabel;
  final VoidCallback? onNext;
  final String? backLabel;
  final VoidCallback? onBack;
  final bool nextEnabled;
  final bool busy;
  final bool showFooter;

  @override
  Widget build(BuildContext context) {
    final tokens = AppTokens.of(context);
    final theme = Theme.of(context);
    final step = currentStep.clamp(0, steps.isEmpty ? 0 : steps.length - 1);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (var i = 0; i < steps.length; i++) ...[
                if (i > 0)
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: tokens.spaceSm),
                    child: Icon(
                      Icons.chevron_right,
                      size: 18,
                      color: theme.colorScheme.outline,
                    ),
                  ),
                _StepChip(
                  index: i + 1,
                  label: steps[i],
                  active: i == step,
                  complete: i < step,
                ),
              ],
            ],
          ),
        ),
        SizedBox(height: tokens.spaceLg),
        Expanded(child: body),
        if (showFooter) ...[
          SizedBox(height: tokens.spaceMd),
          const Divider(height: 1),
          SizedBox(height: tokens.spaceMd),
          Row(
            children: [
              if (onBack != null && backLabel != null)
                OutlinedButton(
                  onPressed: busy ? null : onBack,
                  child: Text(backLabel!),
                ),
              const Spacer(),
              FilledButton(
                onPressed: busy || !nextEnabled ? null : onNext,
                child: busy
                    ? SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: theme.colorScheme.onPrimary,
                        ),
                      )
                    : Text(nextLabel),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class _StepChip extends StatelessWidget {
  const _StepChip({
    required this.index,
    required this.label,
    required this.active,
    required this.complete,
  });

  final int index;
  final String label;
  final bool active;
  final bool complete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final color = active || complete ? scheme.primary : scheme.outline;
    return Semantics(
      selected: active,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            radius: 12,
            backgroundColor: active || complete
                ? scheme.primaryContainer
                : scheme.surfaceContainerHighest,
            foregroundColor: color,
            child: complete
                ? const Icon(Icons.check, size: 14)
                : Text('$index', style: theme.textTheme.labelSmall),
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: theme.textTheme.labelLarge?.copyWith(
              color: color,
              fontWeight: active ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
