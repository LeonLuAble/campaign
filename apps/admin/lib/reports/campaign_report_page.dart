import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

import '../dashboards/aggregate_dashboard_page.dart';
import '../imports/download_csv.dart';
import '../l10n/app_localizations.dart';
import '../people/community_picker_field.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class CampaignReportPage extends StatefulWidget {
  const CampaignReportPage({
    this.customerId,
    this.campaignId,
    this.data,
    this.csv,
    this.embedded = false,
    super.key,
  });

  final String? customerId;
  final String? campaignId;
  final AggregateDashboard? data;
  final String? csv;
  final bool embedded;

  @override
  State<CampaignReportPage> createState() => _CampaignReportPageState();
}

class _CampaignReportPageState extends State<CampaignReportPage> {
  AggregateReport? _campaignReport;
  AggregateReport? _communityReport;
  AggregateDashboard? _legacy;
  List<Community> _communities = const [];
  String? _communityId;
  String? _csv;
  String? _error;
  String? _status;
  var _loading = false;
  var _exporting = false;
  var _bootstrapped = false;

  bool get _canExport =>
      ApiScope.of(context).session.hasPermission('reports.export');

  @override
  void initState() {
    super.initState();
    _legacy = widget.data;
    _csv = widget.csv;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_bootstrapped) {
      return;
    }
    _bootstrapped = true;
    if (widget.campaignId != null && _campaignReport == null && _legacy == null) {
      _bootstrap();
    } else if (widget.customerId != null) {
      _loadCommunities();
    }
  }

  Future<void> _bootstrap() async {
    await Future.wait([_loadCommunities(), _loadCampaignReport()]);
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
    } catch (_) {}
  }

  Future<void> _loadCampaignReport() async {
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
      final report =
          await ApiScope.of(context).client.getCampaignReport(campaignId);
      if (!mounted) {
        return;
      }
      setState(() {
        _campaignReport = report;
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

  Future<void> _loadCommunityReport(String communityId) async {
    final campaignId = widget.campaignId;
    if (campaignId == null) {
      return;
    }
    final l10n = AppLocalizations.of(context);
    setState(() {
      _loading = true;
      _error = null;
      _communityId = communityId;
    });
    try {
      final report = await ApiScope.of(context).client.getCommunityReport(
            campaignId: campaignId,
            communityId: communityId,
          );
      if (!mounted) {
        return;
      }
      setState(() {
        _communityReport = report;
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

  Future<void> _export({required bool community}) async {
    final l10n = AppLocalizations.of(context);
    final campaignId = widget.campaignId;
    if (campaignId == null || !_canExport) {
      return;
    }
    setState(() {
      _exporting = true;
      _error = null;
    });
    try {
      final client = ApiScope.of(context).client;
      final csv = community
          ? await client.exportCommunityReportCsv(
              campaignId: campaignId,
              communityId: _communityId!,
            )
          : await client.exportCampaignReportCsv(campaignId);
      downloadTextFile(
        filename: community
            ? 'community-report-$campaignId.csv'
            : 'campaign-report-$campaignId.csv',
        content: csv,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _csv = csv;
        _status = l10n.reportExportDownloaded;
        _exporting = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _exporting = false;
        _error = localizeApiError(l10n, error);
      });
    }
  }

  Widget _reportCard({
    required String title,
    required String description,
    required AggregateReport? report,
    required VoidCallback? onExport,
  }) {
    final l10n = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(description),
            const SizedBox(height: 8),
            Text(l10n.anonymousReportNote),
            const SizedBox(height: 4),
            Text(
              l10n.reportNoDateFilter,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (report != null) ...[
              const SizedBox(height: 12),
              if (report.generatedAt.isNotEmpty)
                Text(
                  l10n.reportGeneratedAt(
                    formatReportGeneratedAt(report.generatedAt, locale),
                  ),
                ),
              Text(
                '${l10n.dashboardMetricParticipants}: ${report.participantCount ?? 0}',
              ),
              for (final unit in report.units)
                Text(
                  l10n.reportUnitLine(
                    unit.unit,
                    formatNumber(unit.achievedValue),
                    formatNumber(unit.targetValue),
                    unit.completionPercent == null
                        ? '—'
                        : '${formatNumber(unit.completionPercent!)}%',
                  ),
                ),
            ],
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton.icon(
                onPressed: onExport == null || _exporting ? null : onExport,
                icon: const Icon(Icons.download_outlined),
                label: Text(l10n.exportCsv),
              ),
            ),
            if (!_canExport)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(l10n.exportRequiresPermission),
              ),
            if (_status != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(_status!),
              ),
          ],
        ),
      ),
    );
  }

  Widget _body(AppLocalizations l10n) {
    if (_loading && _campaignReport == null && _legacy == null) {
      return const LoadingSkeleton(lines: 6);
    }
    if (_error != null && _campaignReport == null && _legacy == null) {
      return ErrorState(
        message: _error!,
        onRetry: _loadCampaignReport,
        retryLabel: l10n.retry,
      );
    }
    if (_campaignReport == null && _legacy == null) {
      return EmptyState(message: l10n.emptyReport);
    }

    final legacyPercent = _legacy?.progress.completionPercent;

    return ListView(
      padding: const EdgeInsets.all(8),
      children: [
        if (_campaignReport != null)
          _reportCard(
            title: l10n.reportCampaignTitle,
            description: l10n.reportCampaignDescription,
            report: _campaignReport,
            onExport: _canExport ? () => _export(community: false) : null,
          )
        else if (_legacy != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l10n.anonymousReportNote),
                  Text(l10n.completionLabel('${legacyPercent ?? 0}')),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: widget.campaignId == null || !_canExport
                        ? null
                        : () => _export(community: false),
                    child: Text(l10n.exportCsv),
                  ),
                ],
              ),
            ),
          ),
        const SizedBox(height: 16),
        Text(
          l10n.reportCommunityTitle,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        Text(l10n.reportCommunityDescription),
        const SizedBox(height: 8),
        if (widget.customerId != null)
          CommunityPickerField(
            communities: _communities,
            value: _communityId,
            label: l10n.reportPickCommunity,
            allowClear: true,
            onChanged: (id) {
              if (id == null) {
                setState(() {
                  _communityId = null;
                  _communityReport = null;
                });
              } else {
                _loadCommunityReport(id);
              }
            },
          ),
        if (_communityReport != null) ...[
          const SizedBox(height: 8),
          _reportCard(
            title: l10n.reportCommunityTitle,
            description: l10n.reportCommunityDescription,
            report: _communityReport,
            onExport: _canExport && _communityId != null
                ? () => _export(community: true)
                : null,
          ),
        ],
        if (_csv != null) ...[
          const SizedBox(height: 8),
          SelectableText(_csv!),
        ],
        if (_error != null) ...[
          const SizedBox(height: 8),
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
    final body = _body(l10n);
    if (widget.embedded) {
      return body;
    }
    return Scaffold(
      appBar: AppBar(title: Text(l10n.campaignReportTitle)),
      body: body,
    );
  }
}
