import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';

import '../dashboards/dashboard_view.dart';
import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';
import '../util/format.dart';

class ProgressPage extends StatefulWidget {
  const ProgressPage({required this.campaignId, super.key});

  final String campaignId;

  @override
  State<ProgressPage> createState() => _ProgressPageState();
}

class _ProgressPageState extends State<ProgressPage> {
  ParticipantProgress? _progress;
  VisualizationData? _tree;
  String? _error;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_progress == null && _error == null) {
      _load();
    }
  }

  Future<void> _load() async {
    final client = ApiScope.of(context).client;
    final userId = ApiScope.of(context).session.profile?.id;
    try {
      final rows = await client.listParticipations(widget.campaignId);
      final mine = rows.where((row) => row.userId == userId && row.isEnrolled);
      if (mine.isEmpty) {
        setState(() => _error = AppLocalizations.of(context).emptyDashboard);
        return;
      }
      final progress = await client.getProgress(mine.first.id);
      final tree = await client.getVisualizationData(widget.campaignId);
      setState(() {
        _progress = progress;
        _tree = tree;
      });
    } catch (error) {
      setState(() => _error = localizeApiError(AppLocalizations.of(context), error));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final progress = _progress;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.progressTitle)),
      body: progress == null
          ? Center(
              child: _error == null
                  ? const CircularProgressIndicator()
                  : Text(_error!),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(l10n.progressSection, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                Text(
                  l10n.achievedOfTarget(
                    formatNumber(progress.achievedValue),
                    formatNumber(progress.targetValue),
                    progress.unit ?? '',
                  ),
                ),
                if (progress.completionPercent != null)
                  Text(l10n.completionLabel('${progress.completionPercent}%')),
                const SizedBox(height: 16),
                Text(
                  l10n.visualizationSection,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                TreeVisualizationCard(visualization: _tree),
              ],
            ),
    );
  }
}
