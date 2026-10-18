import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../locale/app_locales.dart';
import '../locale/locale_scope.dart';

/// First-run welcome + language picker (no self-registration).
class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key});

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
            SegmentedButton<Locale>(
              segments: [
                ButtonSegment(
                  value: AppLocales.zhHans,
                  label: Text(l10n.languageChinese),
                ),
                ButtonSegment(
                  value: AppLocales.en,
                  label: Text(l10n.languageEnglish),
                ),
              ],
              selected: {
                localeScope.locale.languageCode == 'zh'
                    ? AppLocales.zhHans
                    : AppLocales.en,
              },
              onSelectionChanged: (value) {
                localeScope.onLocaleChanged(value.first);
              },
            ),
            SizedBox(height: tokens.spaceXxl),
            SizedBox(
              height: 48,
              child: FilledButton(
                onPressed: () => context.go('/login'),
                child: Text(l10n.welcomeContinue),
              ),
            ),
            SizedBox(height: tokens.spaceMd),
            SizedBox(
              height: 48,
              child: TextButton(
                onPressed: () => context.go('/activate'),
                child: Text(l10n.activateLink),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
