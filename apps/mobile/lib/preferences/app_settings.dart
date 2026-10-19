import 'package:flutter/material.dart';

import '../locale/app_locales.dart';

/// Device-local settings. Schema is versioned so later fields (theme, colour,
/// behaviour) can be added without renaming storage keys.
@immutable
class AppSettings {
  const AppSettings({
    required this.schemaVersion,
    required this.localeTag,
    required this.onboardingComplete,
    this.themeMode = ThemeMode.system,
  });

  /// Bump when the persisted shape changes in a breaking way.
  static const currentSchemaVersion = 1;

  /// Default language is Simplified Chinese (product default for 速素数数).
  static const defaults = AppSettings(
    schemaVersion: currentSchemaVersion,
    localeTag: 'zh-Hans',
    onboardingComplete: false,
  );

  final int schemaVersion;

  /// BCP-47 tag stored locally and sent to the API (`zh-Hans` or `en`).
  final String localeTag;

  /// True after the first-launch welcome / language screen is finished.
  final bool onboardingComplete;

  /// Reserved for a later appearance phase. Persisted with a stable default.
  final ThemeMode themeMode;

  Locale get locale => AppLocales.fromApi(localeTag);

  AppSettings copyWith({
    int? schemaVersion,
    String? localeTag,
    bool? onboardingComplete,
    ThemeMode? themeMode,
  }) {
    return AppSettings(
      schemaVersion: schemaVersion ?? this.schemaVersion,
      localeTag: localeTag ?? this.localeTag,
      onboardingComplete: onboardingComplete ?? this.onboardingComplete,
      themeMode: themeMode ?? this.themeMode,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is AppSettings &&
        other.schemaVersion == schemaVersion &&
        other.localeTag == localeTag &&
        other.onboardingComplete == onboardingComplete &&
        other.themeMode == themeMode;
  }

  @override
  int get hashCode =>
      Object.hash(schemaVersion, localeTag, onboardingComplete, themeMode);
}

/// Versioned SharedPreferences key names (v1).
abstract final class AppSettingsKeys {
  static const schemaVersion = 'settings.schemaVersion';
  static const localeTag = 'settings.v1.localeTag';
  static const onboardingComplete = 'settings.v1.onboardingComplete';
  static const themeMode = 'settings.v1.themeMode';
}
