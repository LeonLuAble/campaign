import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import 'dashboard_models.dart';

class AggregateDashboardView extends StatelessWidget {
  const AggregateDashboardView({this.data, super.key});

  final AggregateDashboardData? data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final dashboard = data;
    if (dashboard == null) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [Text(l10n.emptyDashboard)],
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(l10n.anonymousTotalsNote),
        const SizedBox(height: 16),
        Text(
          l10n.progressSection,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        Text(
          l10n.achievedOfTarget(
            _format(dashboard.progress.achievedValue),
            _format(dashboard.progress.targetValue),
            dashboard.progress.unit ?? '',
          ),
        ),
        if (dashboard.progress.completionPercent != null)
          Text(
            l10n.completionLabel('${dashboard.progress.completionPercent}%'),
          ),
        const SizedBox(height: 16),
        Text(
          l10n.visualizationSection,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        _TreeCard(visualization: dashboard.visualization),
        const SizedBox(height: 16),
        Text(
          l10n.measurementsSection,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        ...dashboard.measurements.map(
          (row) => Text(
            l10n.measurementQuantityLabel(
              _format(row.quantity),
              row.sourceUnit,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          l10n.outcomesSection,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        if (dashboard.outcomes.isEmpty) Text(l10n.noOutcomes),
        ...dashboard.outcomes.map((row) => _OutcomeTile(outcome: row)),
        const SizedBox(height: 16),
        Text(
          l10n.timeSeriesSection,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        ...dashboard.timeSeries.map((point) {
          final quantity = point.measurements.isEmpty
              ? 0.0
              : point.measurements.first.quantity.toDouble();
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.periodLabel(point.periodStart, point.periodEnd)),
                const SizedBox(height: 4),
                _QuantityBar(value: quantity),
              ],
            ),
          );
        }),
      ],
    );
  }
}

class _TreeCard extends StatelessWidget {
  const _TreeCard({required this.visualization});

  final VisualizationData visualization;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (!visualization.isActive) {
      return Text(l10n.treeInactive);
    }
    final percent = visualization.completionPercent ?? 0;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.park, size: 48),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(visualization.displayName),
                Text(l10n.completionLabel('$percent%')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _OutcomeTile extends StatelessWidget {
  const _OutcomeTile({required this.outcome});

  final OutcomeTotal outcome;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final source = outcome.contributions.isEmpty
        ? ''
        : outcome.contributions.first.source;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${outcome.outcomeMetric}: ${l10n.outcomeValueLabel(_format(outcome.value), outcome.outcomeUnit)}',
          ),
          if (source.isNotEmpty) Text(l10n.factorSourceLabel(source)),
        ],
      ),
    );
  }
}

class _QuantityBar extends StatelessWidget {
  const _QuantityBar({required this.value});

  final double value;

  @override
  Widget build(BuildContext context) {
    final width = (value * 24).clamp(8, 320).toDouble();
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        height: 12,
        width: width,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary,
          borderRadius: BorderRadius.circular(6),
        ),
      ),
    );
  }
}

String _format(num value) {
  if (value % 1 == 0) {
    return value.toInt().toString();
  }
  return value.toString();
}
