import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';
import 'tree_visualization.dart';

/// Pre-formatted dashboard content. Apps map API models → these strings.
class CampaignDashboardData {
  const CampaignDashboardData({
    this.anonymousNote,
    required this.progressTitle,
    required this.achievedLine,
    this.completionLine,
    required this.visualizationTitle,
    this.treeDisplayName,
    this.treeCompletionLabel,
    this.treeCompletionPercent,
    this.treeIsActive = false,
    required this.treeInactiveLabel,
    this.treeAxis = Axis.horizontal,
    required this.measurementsTitle,
    this.measurementLines = const [],
    required this.outcomesTitle,
    this.noOutcomesLabel,
    this.outcomeLines = const [],
    required this.timeSeriesTitle,
    this.timeSeries = const [],
    this.timeSeriesBarMaxWidth = 320,
  });

  final String? anonymousNote;
  final String progressTitle;
  final String achievedLine;
  final String? completionLine;
  final String visualizationTitle;
  final String? treeDisplayName;
  final String? treeCompletionLabel;
  final num? treeCompletionPercent;
  final bool treeIsActive;
  final String treeInactiveLabel;
  final Axis treeAxis;
  final String measurementsTitle;
  final List<String> measurementLines;
  final String outcomesTitle;
  final String? noOutcomesLabel;
  final List<DashboardOutcomeLine> outcomeLines;
  final String timeSeriesTitle;
  final List<DashboardTimeSeriesLine> timeSeries;
  final double timeSeriesBarMaxWidth;
}

class DashboardOutcomeLine {
  const DashboardOutcomeLine({required this.primary, this.caption});

  final String primary;
  final String? caption;
}

class DashboardTimeSeriesLine {
  const DashboardTimeSeriesLine({
    required this.periodLabel,
    required this.quantity,
  });

  final String periodLabel;
  final double quantity;
}

/// Shared campaign / community / participant dashboard layout.
class CampaignDashboardView extends StatelessWidget {
  const CampaignDashboardView({
    required this.emptyMessage,
    this.data,
    super.key,
  });

  final String emptyMessage;
  final CampaignDashboardData? data;

  @override
  Widget build(BuildContext context) {
    final dashboard = data;
    if (dashboard == null) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [Text(emptyMessage)],
      );
    }

    final tokens = AppTokens.of(context);
    final titleStyle = Theme.of(context).textTheme.titleMedium;

    return ListView(
      padding: EdgeInsets.all(tokens.spaceLg),
      children: [
        if (dashboard.anonymousNote != null) ...[
          Text(dashboard.anonymousNote!),
          SizedBox(height: tokens.spaceLg),
        ],
        Text(dashboard.progressTitle, style: titleStyle),
        SizedBox(height: tokens.spaceSm),
        Text(dashboard.achievedLine),
        if (dashboard.completionLine != null) Text(dashboard.completionLine!),
        SizedBox(height: tokens.spaceLg),
        Text(dashboard.visualizationTitle, style: titleStyle),
        SizedBox(height: tokens.spaceSm),
        TreeVisualization(
          displayName: dashboard.treeDisplayName ?? '',
          completionLabel: dashboard.treeCompletionLabel ?? '',
          completionPercent: dashboard.treeCompletionPercent,
          isActive: dashboard.treeIsActive,
          inactiveLabel: dashboard.treeInactiveLabel,
          axis: dashboard.treeAxis,
        ),
        SizedBox(height: tokens.spaceLg),
        Text(dashboard.measurementsTitle, style: titleStyle),
        SizedBox(height: tokens.spaceSm),
        ...dashboard.measurementLines.map(Text.new),
        SizedBox(height: tokens.spaceLg),
        Text(dashboard.outcomesTitle, style: titleStyle),
        SizedBox(height: tokens.spaceSm),
        if (dashboard.outcomeLines.isEmpty && dashboard.noOutcomesLabel != null)
          Text(dashboard.noOutcomesLabel!),
        ...dashboard.outcomeLines.map(
          (row) => Padding(
            padding: EdgeInsets.only(bottom: tokens.spaceSm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(row.primary),
                if (row.caption != null) Text(row.caption!),
              ],
            ),
          ),
        ),
        SizedBox(height: tokens.spaceLg),
        Text(dashboard.timeSeriesTitle, style: titleStyle),
        SizedBox(height: tokens.spaceSm),
        ...dashboard.timeSeries.map(
          (point) => Padding(
            padding: EdgeInsets.only(bottom: tokens.spaceSm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(point.periodLabel),
                SizedBox(height: tokens.spaceXs),
                _QuantityBar(
                  value: point.quantity,
                  maxWidth: dashboard.timeSeriesBarMaxWidth,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _QuantityBar extends StatelessWidget {
  const _QuantityBar({required this.value, required this.maxWidth});

  final double value;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    final width = (value * 24).clamp(8, maxWidth).toDouble();
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
