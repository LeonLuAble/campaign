import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../widgets/admin_ui.dart';

/// Placeholder until B5 builds the member directory UI.
class PeoplePage extends StatelessWidget {
  const PeoplePage({required this.customerId, super.key});

  final String customerId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return AdminPageBody(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AdminPageHeader(title: l10n.navPeople),
          Expanded(
            child: EmptyState(
              message: l10n.peopleComingSoon,
              icon: Icons.people_outline,
            ),
          ),
        ],
      ),
    );
  }
}
