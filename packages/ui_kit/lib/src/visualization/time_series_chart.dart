import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../theme/app_tokens.dart';

/// One bucket for [TimeSeriesChart]. Labels are pre-formatted by the caller.
class TimeSeriesBucket {
  const TimeSeriesBucket({
    required this.label,
    required this.value,
  });

  final String label;
  final double value;
}

/// Day/week time-series chart with an accessible table alternative.
///
/// Uses the theme primary colour only — never red for low values.
/// Labels and toggle strings are constructor parameters (no embedded l10n).
class TimeSeriesChart extends StatefulWidget {
  const TimeSeriesChart({
    required this.buckets,
    required this.chartModeLabel,
    required this.tableModeLabel,
    required this.emptyLabel,
    this.semanticsLabel,
    this.height = 220,
    this.initialShowTable = false,
    super.key,
  });

  final List<TimeSeriesBucket> buckets;
  final String chartModeLabel;
  final String tableModeLabel;
  final String emptyLabel;
  final String? semanticsLabel;
  final double height;
  final bool initialShowTable;

  @override
  State<TimeSeriesChart> createState() => _TimeSeriesChartState();
}

class _TimeSeriesChartState extends State<TimeSeriesChart> {
  late bool _showTable = widget.initialShowTable;

  @override
  Widget build(BuildContext context) {
    final tokens = AppTokens.of(context);
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    if (widget.buckets.isEmpty) {
      return Text(widget.emptyLabel, style: theme.textTheme.bodyMedium);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: SegmentedButton<bool>(
            segments: [
              ButtonSegment(
                value: false,
                label: Text(widget.chartModeLabel),
                icon: const Icon(Icons.show_chart),
              ),
              ButtonSegment(
                value: true,
                label: Text(widget.tableModeLabel),
                icon: const Icon(Icons.table_rows_outlined),
              ),
            ],
            selected: {_showTable},
            onSelectionChanged: (value) {
              setState(() => _showTable = value.first);
            },
          ),
        ),
        SizedBox(height: tokens.spaceMd),
        if (_showTable)
          _BucketTable(buckets: widget.buckets)
        else
          Semantics(
            label: widget.semanticsLabel ?? widget.chartModeLabel,
            child: SizedBox(
              height: widget.height,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: _maxY(widget.buckets),
                  barTouchData: BarTouchData(enabled: true),
                  titlesData: FlTitlesData(
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 36,
                        getTitlesWidget: (value, meta) {
                          if (value == meta.max) {
                            return const SizedBox.shrink();
                          }
                          return Text(
                            value.toInt().toString(),
                            style: theme.textTheme.labelSmall,
                          );
                        },
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 36,
                        getTitlesWidget: (value, meta) {
                          final index = value.toInt();
                          if (index < 0 || index >= widget.buckets.length) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: Text(
                              widget.buckets[index].label,
                              style: theme.textTheme.labelSmall,
                              overflow: TextOverflow.ellipsis,
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    getDrawingHorizontalLine: (value) => FlLine(
                      color: scheme.outlineVariant.withValues(alpha: 0.5),
                      strokeWidth: 1,
                    ),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: [
                    for (var i = 0; i < widget.buckets.length; i++)
                      BarChartGroupData(
                        x: i,
                        barRods: [
                          BarChartRodData(
                            toY: widget.buckets[i].value,
                            color: scheme.primary,
                            width: 16,
                            borderRadius: BorderRadius.circular(
                              tokens.radiusChip,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  double _maxY(List<TimeSeriesBucket> buckets) {
    var max = 0.0;
    for (final bucket in buckets) {
      if (bucket.value > max) {
        max = bucket.value;
      }
    }
    if (max <= 0) {
      return 1;
    }
    return max * 1.15;
  }
}

class _BucketTable extends StatelessWidget {
  const _BucketTable({required this.buckets});

  final List<TimeSeriesBucket> buckets;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Table(
      columnWidths: const {
        0: FlexColumnWidth(2),
        1: FlexColumnWidth(1),
      },
      children: [
        for (final bucket in buckets)
          TableRow(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Text(bucket.label, style: theme.textTheme.bodyMedium),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Text(
                  bucket.value % 1 == 0
                      ? bucket.value.toInt().toString()
                      : bucket.value.toString(),
                  style: theme.textTheme.bodyMedium,
                  textAlign: TextAlign.end,
                ),
              ),
            ],
          ),
      ],
    );
  }
}
