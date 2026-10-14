import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class CampaignReportPage extends StatefulWidget {
  const CampaignReportPage({
    this.campaignId,
    this.data,
    this.csv,
    super.key,
  });

  final String? campaignId;
  final AggregateDashboard? data;
  final String? csv;

  @override
  State<CampaignReportPage> createState() => _CampaignReportPageState();
}

class _CampaignReportPageState extends State<CampaignReportPage> {
  AggregateReport? _report;
  AggregateDashboard? _legacy;
  String? _csv;
  String? _error;
  String? _status;

  @override
  void initState() {
    super.initState();
    _legacy = widget.data;
    _csv = widget.csv;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_report == null &&
        _legacy == null &&
        widget.campaignId != null &&
        _error == null) {
      _load();
    }
  }

  Future<void> _load() async {
    final campaignId = widget.campaignId;
    if (campaignId == null) {
      return;
    }
    try {
      final report = await ApiScope.of(context).client.getCampaignReport(
        campaignId,
      );
      setState(() => _report = report);
    } catch (error) {
      setState(() => _error = localizeApiError(AppLocalizations.of(context), error));
    }
  }

  Future<void> _export() async {
    final l10n = AppLocalizations.of(context);
    final campaignId = widget.campaignId;
    if (campaignId == null) {
      return;
    }
    try {
      final csv = await ApiScope.of(context).client.exportCampaignReportCsv(
        campaignId,
      );
      setState(() {
        _csv = csv;
        _status = l10n.exportReady;
      });
    } catch (error) {
      setState(() => _error = localizeApiError(l10n, error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final percent = _report?.units.isNotEmpty == true
        ? _report!.units.first.completionPercent
        : _legacy?.progress.completionPercent;
    final empty = _report == null && _legacy == null;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.campaignReportTitle)),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: empty
            ? Center(child: Text(_error ?? l10n.emptyReport))
            : ListView(
                children: [
                  Text(l10n.anonymousReportNote),
                  const SizedBox(height: 12),
                  Text(l10n.completionLabel('${percent ?? 0}')),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: widget.campaignId == null ? null : _export,
                    child: Text(l10n.exportCsv),
                  ),
                  const SizedBox(height: 8),
                  Text(l10n.exportRequiresPermission),
                  if (_status != null) Text(_status!),
                  if (_csv != null) Text(_csv!),
                  if (_error != null) Text(_error!),
                ],
              ),
      ),
    );
  }
}
