import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../locale/locale_scope.dart';
import '../preferences/language_control.dart';
import '../preferences/preferences_scope.dart';

/// First-run welcome + language picker (no self-registration).
class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key});

  Future<void> _finish(BuildContext context, {required String next}) async {
    final prefs = PreferencesScope.of(context);
    await prefs.completeOnboarding();
    if (!context.mounted) {
      return;
    }
    context.go(next);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final localeScope = LocaleScope.of(context);
    final tokens = AppTokens.of(context);
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: EdgeInsets.all(tokens.spaceXl),
          children: [
            SizedBox(height: tokens.spaceXl),
            Text(
              l10n.appTitle,
              style: theme.textTheme.headlineMedium,
              textAlign: TextAlign.center,
            ),
            SizedBox(height: tokens.spaceMd),
            Text(
              l10n.welcomeSubtitle,
              style: theme.textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
            SizedBox(height: tokens.spaceXl),
            Text(
              l10n.welcomeSpiritTitle,
              style: theme.textTheme.titleMedium,
            ),
            SizedBox(height: tokens.spaceSm),
            Text(l10n.welcomeSpiritBody),
            SizedBox(height: tokens.spaceXl),
            Text(l10n.languageLabel, style: theme.textTheme.titleMedium),
            SizedBox(height: tokens.spaceSm),
            LanguageSegmentedControl(
              value: localeScope.locale,
              onChanged: localeScope.onLocaleChanged,
            ),
            SizedBox(height: tokens.spaceXxl),
            SizedBox(
              height: 48,
              child: FilledButton(
                onPressed: () => _finish(context, next: '/login'),
                child: Text(l10n.welcomeContinue),
              ),
            ),
            SizedBox(height: tokens.spaceMd),
            SizedBox(
              height: 48,
              child: TextButton(
                onPressed: () => _finish(context, next: '/activate'),
                child: Text(l10n.activateLink),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
