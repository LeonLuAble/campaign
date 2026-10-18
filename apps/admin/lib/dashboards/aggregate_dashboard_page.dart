import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:ui_kit/ui_kit.dart';

import '../campaigns/campaign_dates.dart';
import '../l10n/app_localizations.dart';
import '../people/community_picker_field.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class AggregateDashboardPage extends StatefulWidget {
  const AggregateDashboardPage({
    required this.scope,
    this.customerId,
    this.campaignId,
    this.communityId,
    this.data,
    this.embedded = false,
    super.key,
  });

  final String scope;
  final String? customerId;
  final String? campaignId;
  final String? communityId;
  final AggregateDashboard? data;

  /// When true, omit the Scaffold chrome (used inside campaign workspace tabs).
  final bool embedded;

  @override
  State<AggregateDashboardPage> createState() => _AggregateDashboardPageState();
}

class _AggregateDashboardPageState extends State<AggregateDashboardPage> {
  AggregateDashboard? _data;
  List<Community> _communities = const [];
  String? _communityId;
  var _includeSubCommunities = true;
  var _granularity = 'day';
  String? _error;
  var _loading = false;
  var _bootstrapped = false;

  @override
  void initState() {
    super.initState();
    _data = widget.data;
    _communityId = widget.communityId;
  }

  @override
  void didUpdateWidget(covariant AggregateDashboardPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.campaignId != widget.campaignId ||
        oldWidget.communityId != widget.communityId ||
        oldWidget.data != widget.data) {
      _data = widget.data;
      _communityId = widget.communityId;
      if (widget.data == null && widget.campaignId != null) {
        _load();
      }
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_bootstrapped) {
      return;
    }
    _bootstrapped = true;
    if (_data == null && widget.campaignId != null) {
      _bootstrap();
    } else if (widget.customerId != null) {
      _loadCommunities();
    }
  }

  Future<void> _bootstrap() async {
    await Future.wait([_loadCommunities(), _load()]);
  }

  Future<void> _loadCommunities() async {
    final customerId = widget.customerId;
    if (customerId == null) {
      return;
    }
    try {
      final rows =
          await ApiScope.of(context).client.listCommunities(customerId);
      if (!mounted) {
        return;
      }
      setState(() => _communities = rows);
    } catch (_) {
      // Picker is optional; dashboard can still load.
    }
  }

  Future<void> _load() async {
    final campaignId = widget.campaignId;
    if (campaignId == null) {
      return;
    }
    final l10n = AppLocalizations.of(context);
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final client = ApiScope.of(context).client;
      final data = _communityId == null
          ? await client.getCampaignDashboard(
              campaignId,
              granularity: _granularity,
            )
          : await client.getCommunityDashboard(
              campaignId: campaignId,
              communityId: _communityId!,
              granularity: _granularity,
            );
      if (!mounted) {
        return;
      }
      setState(() {
        _data = data;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = localizeApiError(l10n, error);
        _loading = false;
      });
    }
  }

  String _progressStatusLabel(AppLocalizations l10n, DashboardProgress progress) {
    final status = progress.completionStatus;
    if (status == 'exceeded' ||
        (progress.completionPercent != null &&
            progress.completionPercent! > 100)) {
      return l10n.dashboardProgressStatusExceeded;
    }
    if (status == 'achieved' ||
        (progress.completionPercent != null &&
            progress.completionPercent! >= 100)) {
      return l10n.dashboardProgressStatusAchieved;
    }
    if (status == 'not_started' ||
        progress.completionPercent == null ||
        progress.completionPercent == 0) {
      return l10n.dashboardProgressStatusNotStarted;
    }
    return l10n.dashboardProgressStatusInProgress;
  }

  double _completionRatio(DashboardProgress progress) {
    if (progress.completionPercent != null) {
      return progress.completionPercent!.toDouble() / 100;
    }
    if (progress.targetValue <= 0) {
      return 0;
    }
    return progress.achievedValue.toDouble() / progress.targetValue.toDouble();
  }

  String? _participationRate(AppLocalizations l10n, DashboardProgress progress) {
    final total = progress.participantCount;
    final committed = progress.committedParticipantCount;
    if (total == null || total <= 0 || committed == null) {
      return null;
    }
    final percent = ((committed / total) * 100).round();
    return l10n.dashboardParticipationRateValue('$percent');
  }

  List<TimeSeriesBucket> _buckets(
    AggregateDashboard dashboard,
    Locale locale,
  ) {
    return [
      for (final point in dashboard.timeSeries)
        TimeSeriesBucket(
          label: _periodLabel(point, locale),
          value: point.measurements.isEmpty
              ? 0
              : point.measurements.first.quantity.toDouble(),
        ),
    ];
  }

  String _periodLabel(TimeSeriesPoint point, Locale locale) {
    if (_granularity == 'week') {
      final start = formatCampaignDate(point.periodStart, locale);
      final end = formatCampaignDate(point.periodEnd, locale);
      if (start.isEmpty) {
        return point.periodStart;
      }
      return end.isEmpty ? start : '$start – $end';
    }
    final single = formatCampaignDate(point.periodStart, locale);
    return single.isEmpty ? point.periodStart : single;
  }

  Widget _body(AppLocalizations l10n) {
    if (_loading && _data == null) {
      return const LoadingSkeleton(lines: 8);
    }
    if (_error != null && _data == null) {
      return ErrorState(
        message: _error!,
        onRetry: _load,
        retryLabel: l10n.retry,
      );
    }
    final dashboard = _data;
    if (dashboard == null) {
      return EmptyState(message: l10n.emptyDashboard);
    }

    final locale = Localizations.localeOf(context);
    final progress = dashboard.progress;
    final ratio = _completionRatio(progress);
    final statusLabel = _progressStatusLabel(l10n, progress);
    final rate = _participationRate(l10n, progress);
    final percentText = progress.completionPercent == null
        ? '0'
        : formatNumber(progress.completionPercent!);
    final treeName = dashboard.visualization.displayName;

    return ListView(
      padding: const EdgeInsets.all(8),
      children: [
        Text(l10n.anonymousTotalsNote),
        const SizedBox(height: 12),
        if (widget.customerId != null) ...[
          CommunityPickerField(
            communities: _communities,
            value: _communityId,
            label: l10n.dashboardCommunityPickerLabel,
            allowClear: true,
            onChanged: (id) {
              setState(() => _communityId = id);
              _load();
            },
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(l10n.dashboardIncludeSubCommunities),
            subtitle: Text(l10n.dashboardIncludeSubCommunitiesHelp),
            value: _includeSubCommunities,
            onChanged: (value) {
              setState(() => _includeSubCommunities = value ?? true);
            },
          ),
          const SizedBox(height: 8),
        ],
        SegmentedButton<String>(
          segments: [
            ButtonSegment(
              value: 'day',
              label: Text(l10n.dashboardGranularityDay),
            ),
            ButtonSegment(
              value: 'week',
              label: Text(l10n.dashboardGranularityWeek),
            ),
          ],
          selected: {_granularity},
          onSelectionChanged: (value) {
            setState(() => _granularity = value.first);
            _load();
          },
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            SizedBox(
              width: 200,
              child: MetricTile(
                label: l10n.dashboardMetricParticipants,
                value: '${progress.participantCount ?? 0}',
                icon: Icons.groups_outlined,
              ),
            ),
            if (rate != null)
              SizedBox(
                width: 200,
                child: MetricTile(
                  label: l10n.dashboardMetricParticipationRate,
                  value: rate,
                  icon: Icons.percent,
                ),
              ),
            SizedBox(
              width: 200,
              child: MetricTile(
                label: l10n.dashboardMetricCompleted,
                value: l10n.measurementQuantityLabel(
                  formatNumber(progress.achievedValue),
                  progress.unit ?? '',
                ),
                icon: Icons.check_circle_outline,
              ),
            ),
            SizedBox(
              width: 220,
              child: MetricTile(
                label: l10n.dashboardMetricProgress,
                value: statusLabel,
                caption: l10n.achievedOfTarget(
                  formatNumber(progress.achievedValue),
                  formatNumber(progress.targetValue),
                  progress.unit ?? '',
                ),
                icon: Icons.flag_outlined,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ProgressRing(
              completion: ratio,
              label: statusLabel,
              semanticsLabel: l10n.completionLabel(percentText),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                l10n.achievedOfTarget(
                  formatNumber(progress.achievedValue),
                  formatNumber(progress.targetValue),
                  progress.unit ?? '',
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text(
          l10n.timeSeriesSection,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        TimeSeriesChart(
          buckets: _buckets(dashboard, locale),
          chartModeLabel: l10n.dashboardChartMode,
          tableModeLabel: l10n.dashboardTableMode,
          emptyLabel: l10n.dashboardChartEmpty,
          semanticsLabel: l10n.timeSeriesSection,
        ),
        const SizedBox(height: 24),
        Text(
          l10n.visualizationSection,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        TreeVisualization(
          displayName: treeName,
          completionLabel: l10n.completionLabel(
            '${dashboard.visualization.completionPercent ?? 0}',
          ),
          completionPercent: dashboard.visualization.completionPercent,
          isActive: dashboard.visualization.isActive,
          inactiveLabel: l10n.treeInactive,
        ),
        if (dashboard.visualization.isActive) ...[
          const SizedBox(height: 8),
          Text(
            l10n.dashboardTreeTextAlternative(
              treeName,
              '${dashboard.visualization.completionPercent ?? 0}',
            ),
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
        const SizedBox(height: 24),
        Text(
          l10n.outcomesSection,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        if (dashboard.outcomes.isEmpty)
          Text(l10n.noOutcomes)
        else
          ...dashboard.outcomes.map((row) {
            final source = row.contributions.isEmpty
                ? null
                : row.contributions.first.source;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: MetricTile(
                label: row.outcomeMetric,
                value: l10n.outcomeValueLabel(
                  formatNumber(row.value),
                  row.outcomeUnit,
                ),
                caption: source == null || source.isEmpty
                    ? null
                    : l10n.factorSourceLabel(source),
                icon: Icons.eco_outlined,
              ),
            );
          }),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(
            _error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final title = (_communityId != null || widget.scope == 'community')
        ? l10n.communityDashboardTitle
        : l10n.campaignDashboardTitle;
    final body = _body(l10n);
    if (widget.embedded) {
      return body;
    }
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: body,
    );
  }
}

/// Formats an ISO timestamp with [locale] for report headers.
String formatReportGeneratedAt(String iso, Locale locale) {
  final parsed = DateTime.tryParse(iso);
  if (parsed == null) {
    return iso;
  }
  return DateFormat.yMMMd(locale.toString()).add_jm().format(parsed.toLocal());
}
