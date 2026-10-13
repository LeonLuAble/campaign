import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import 'dashboard_models.dart';
import 'dashboard_view.dart';

class ParticipantDashboardPage extends StatelessWidget {
  const ParticipantDashboardPage({this.data, super.key});

  final ParticipantDashboardData? data;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.participantDashboardTitle)),
      body: ParticipantDashboardView(data: data),
    );
  }
}
