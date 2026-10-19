import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

import '../l10n/app_localizations.dart';
import '../locale/app_locales.dart';

/// Full-width language segmented control (welcome / settings).
class LanguageSegmentedControl extends StatelessWidget {
  const LanguageSegmentedControl({
    required this.value,
    required this.onChanged,
    super.key,
  });

  final Locale value;
  final ValueChanged<Locale> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final selected =
        value.languageCode == 'zh' ? AppLocales.zhHans : AppLocales.en;
    return Semantics(
      label: l10n.languageLabel,
      child: SegmentedButton<Locale>(
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
        selected: {selected},
        onSelectionChanged: (next) => onChanged(next.first),
      ),
    );
  }
}

/// Compact AppBar language menu for the sign-in screen.
class LanguageShortcutButton extends StatelessWidget {
  const LanguageShortcutButton({
    required this.value,
    required this.onChanged,
    super.key,
  });

  final Locale value;
  final ValueChanged<Locale> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = AppTokens.of(context);
    final isZh = value.languageCode == 'zh';
    final currentLabel = isZh ? l10n.languageChinese : l10n.languageEnglish;

    return PopupMenuButton<Locale>(
      tooltip: l10n.languageLabel,
      onSelected: onChanged,
      itemBuilder: (context) => [
        PopupMenuItem(
          value: AppLocales.zhHans,
          child: Text(l10n.languageChinese),
        ),
        PopupMenuItem(
          value: AppLocales.en,
          child: Text(l10n.languageEnglish),
        ),
      ],
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: tokens.spaceMd),
        child: Semantics(
          button: true,
          label: l10n.languageShortcutSemantics(currentLabel),
          child: SizedBox(
            height: 48,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.language, size: 20),
                SizedBox(width: tokens.spaceXs),
                Text(currentLabel),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
