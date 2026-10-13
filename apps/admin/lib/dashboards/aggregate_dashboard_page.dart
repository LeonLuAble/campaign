import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import 'dashboard_models.dart';
import 'dashboard_view.dart';

class AggregateDashboardPage extends StatelessWidget {
  const AggregateDashboardPage({
    required this.scope,
    this.data,
    super.key,
  });

  final String scope;
  final AggregateDashboardData? data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final title = scope == 'community'
        ? l10n.communityDashboardTitle
        : l10n.campaignDashboardTitle;
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: AggregateDashboardView(data: data),
    );
  }
}
