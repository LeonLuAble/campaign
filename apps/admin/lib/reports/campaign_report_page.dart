import 'package:flutter/material.dart';

import '../dashboards/dashboard_models.dart';
import '../l10n/app_localizations.dart';

class CampaignReportPage extends StatelessWidget {
  const CampaignReportPage({this.data, super.key});

  final AggregateDashboardData? data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.campaignReportTitle)),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: data == null
            ? Center(child: Text(l10n.emptyReport))
            : ListView(
                children: [
                  Text(l10n.anonymousReportNote),
                  const SizedBox(height: 12),
                  Text(
                    l10n.completionLabel(
                      '${data!.progress.completionPercent ?? 0}',
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () {},
                    child: Text(l10n.exportCsv),
                  ),
                  const SizedBox(height: 8),
                  Text(l10n.exportRequiresPermission),
                ],
              ),
      ),
    );
  }
}
