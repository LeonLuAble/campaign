import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../util/format.dart';

class ParticipantDashboardView extends StatelessWidget {
  const ParticipantDashboardView({this.data, super.key});

  final ParticipantDashboard? data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final dashboard = data;
    if (dashboard == null) {
      return CampaignDashboardView(emptyMessage: l10n.emptyDashboard);
    }

    return CampaignDashboardView(
      emptyMessage: l10n.emptyDashboard,
      data: CampaignDashboardData(
        progressTitle: l10n.progressSection,
        achievedLine: l10n.achievedOfTarget(
          formatNumber(dashboard.progress.achievedValue),
          formatNumber(dashboard.progress.targetValue),
          dashboard.progress.unit ?? '',
        ),
        completionLine: dashboard.progress.completionPercent == null
            ? null
            : l10n.completionLabel('${dashboard.progress.completionPercent}%'),
        visualizationTitle: l10n.visualizationSection,
        treeDisplayName: dashboard.visualization.displayName,
        treeCompletionLabel: l10n.completionLabel(
          '${dashboard.visualization.completionPercent ?? 0}%',
        ),
        treeCompletionPercent: dashboard.visualization.completionPercent,
        treeIsActive: dashboard.visualization.isActive,
        treeInactiveLabel: l10n.treeInactive,
        treeAxis: Axis.vertical,
        measurementsTitle: l10n.measurementsSection,
        measurementLines: dashboard.measurements
            .map(
              (row) => l10n.measurementQuantityLabel(
                formatNumber(row.quantity),
                row.sourceUnit,
              ),
            )
            .toList(),
        outcomesTitle: l10n.outcomesSection,
        noOutcomesLabel: l10n.noOutcomes,
        outcomeLines: dashboard.outcomes.map((row) {
          final source = row.contributions.isEmpty
              ? null
              : row.contributions.first.source;
          return DashboardOutcomeLine(
            primary:
                '${row.outcomeMetric}: ${l10n.outcomeValueLabel(formatNumber(row.value), row.outcomeUnit)}',
            caption: source == null || source.isEmpty
                ? null
                : l10n.factorSourceLabel(source),
          );
        }).toList(),
        timeSeriesTitle: l10n.timeSeriesSection,
        timeSeries: dashboard.timeSeries.map((point) {
          final quantity = point.measurements.isEmpty
              ? 0.0
              : point.measurements.first.quantity.toDouble();
          return DashboardTimeSeriesLine(
            periodLabel: l10n.periodLabel(point.periodStart, point.periodEnd),
            quantity: quantity,
          );
        }).toList(),
        timeSeriesBarMaxWidth: 240,
      ),
    );
  }
}

class TreeVisualizationCard extends StatelessWidget {
  const TreeVisualizationCard({this.visualization, super.key});

  final VisualizationData? visualization;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final data = visualization;
    if (data == null || !data.isActive) {
      return TreeVisualization(
        displayName: '',
        completionLabel: '',
        isActive: false,
        inactiveLabel: l10n.treeInactive,
        axis: Axis.vertical,
      );
    }
    return TreeVisualization(
      displayName: data.displayName,
      completionLabel: l10n.completionLabel('${data.completionPercent ?? 0}%'),
      completionPercent: data.completionPercent,
      isActive: true,
      inactiveLabel: l10n.treeInactive,
      axis: Axis.vertical,
    );
  }
}
