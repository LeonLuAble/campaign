import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/app_config_scope.dart';
import '../l10n/app_localizations.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final config = AppConfigScope.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.appTitle)),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(l10n.homeMessage),
            const SizedBox(height: 12),
            Text(l10n.environmentLabel(config.environment)),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: () => context.go('/campaigns/dashboard'),
              child: Text(l10n.openCampaignDashboard),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => context.go('/communities/dashboard'),
              child: Text(l10n.openCommunityDashboard),
            ),
          ],
        ),
      ),
    );
  }
}
