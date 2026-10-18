import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';

/// Placeholder until M4 builds the daily check-in / record flow.
class CheckInPlaceholderPage extends StatelessWidget {
  const CheckInPlaceholderPage({required this.campaignId, super.key});

  final String campaignId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.checkInTitle)),
      body: ListView(
        padding: EdgeInsets.all(tokens.spaceLg),
        children: [
          EmptyState(message: l10n.checkInComingSoon),
          SizedBox(height: tokens.spaceLg),
          SizedBox(
            height: 48,
            width: double.infinity,
            child: FilledButton(
              onPressed: () =>
                  context.go('/campaigns/$campaignId/participation'),
              child: Text(l10n.backToParticipation),
            ),
          ),
        ],
      ),
    );
  }
}
