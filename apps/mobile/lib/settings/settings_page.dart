import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../locale/app_locales.dart';
import '../locale/locale_scope.dart';
import '../preferences/language_control.dart';
import '../preferences/preferences_scope.dart';
import '../session/api_scope.dart';

/// Device settings: language now; appearance / behaviour sections later.
class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);
    final localeScope = LocaleScope.of(context);
    final prefs = PreferencesScope.of(context);
    final session = ApiScope.of(context).session;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.settingsTitle)),
      body: ListView(
        padding: EdgeInsets.all(tokens.spaceLg),
        children: [
          Text(
            l10n.settingsLanguageSection,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          SizedBox(height: tokens.spaceSm),
          Text(
            l10n.settingsLanguageHint,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          SizedBox(height: tokens.spaceMd),
          LanguageSegmentedControl(
            value: localeScope.locale,
            onChanged: (next) async {
              localeScope.onLocaleChanged(next);
              await prefs.setLocale(next);
              if (session.isAuthenticated) {
                await session.applyLocale(AppLocales.toApi(next));
              }
            },
          ),
        ],
      ),
    );
  }
}
