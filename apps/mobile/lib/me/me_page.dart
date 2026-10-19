import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../session/api_scope.dart';

class MePage extends StatelessWidget {
  const MePage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final session = ApiScope.of(context).session;
    final tokens = AppTokens.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l10n.navMe)),
      body: ListenableBuilder(
        listenable: session,
        builder: (context, _) {
          final profile = session.profile;
          final name = profile?.displayName?.trim().isNotEmpty == true
              ? profile!.displayName!
              : (profile?.identities.isNotEmpty == true
                  ? profile!.identities.first.identifier
                  : l10n.meAnonymousName);
          return ListView(
            padding: EdgeInsets.all(tokens.spaceLg),
            children: [
              Text(name, style: Theme.of(context).textTheme.headlineSmall),
              if (session.customer != null) ...[
                SizedBox(height: tokens.spaceXs),
                Text(session.customer!.name),
              ],
              if (session.selectedCommunityName != null) ...[
                Text(
                  l10n.homeCommunityLabel(session.selectedCommunityName!),
                ),
              ],
              SizedBox(height: tokens.spaceXl),
              Text(
                l10n.meAccountSection,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              SizedBox(height: tokens.spaceSm),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.settings_outlined),
                title: Text(l10n.openSettings),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/settings'),
                minVerticalPadding: 16,
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.notifications_outlined),
                title: Text(l10n.openNotifications),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/notifications'),
                minVerticalPadding: 16,
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.alarm_outlined),
                title: Text(l10n.openPreferences),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/preferences'),
                minVerticalPadding: 16,
              ),
              SizedBox(height: tokens.spaceXl),
              SizedBox(
                height: 48,
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => session.logout(),
                  child: Text(l10n.logout),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
