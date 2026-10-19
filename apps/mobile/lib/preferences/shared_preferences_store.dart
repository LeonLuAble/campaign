import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app_settings.dart';
import 'preferences_store.dart';

class SharedPreferencesStore implements PreferencesStore {
  SharedPreferencesStore({this._prefs});

  SharedPreferences? _prefs;

  Future<SharedPreferences> _ensure() async {
    return _prefs ??= await SharedPreferences.getInstance();
  }

  @override
  Future<AppSettings> load() async {
    final prefs = await _ensure();
    final version =
        prefs.getInt(AppSettingsKeys.schemaVersion) ??
        AppSettings.currentSchemaVersion;
    final localeTag =
        prefs.getString(AppSettingsKeys.localeTag) ??
        AppSettings.defaults.localeTag;
    final onboarding =
        prefs.getBool(AppSettingsKeys.onboardingComplete) ??
        AppSettings.defaults.onboardingComplete;
    final themeRaw = prefs.getString(AppSettingsKeys.themeMode);
    return AppSettings(
      schemaVersion: version,
      localeTag: _normalizeLocaleTag(localeTag),
      onboardingComplete: onboarding,
      themeMode: _parseThemeMode(themeRaw),
    );
  }

  @override
  Future<void> save(AppSettings settings) async {
    final prefs = await _ensure();
    await prefs.setInt(AppSettingsKeys.schemaVersion, settings.schemaVersion);
    await prefs.setString(AppSettingsKeys.localeTag, settings.localeTag);
    await prefs.setBool(
      AppSettingsKeys.onboardingComplete,
      settings.onboardingComplete,
    );
    await prefs.setString(
      AppSettingsKeys.themeMode,
      settings.themeMode.name,
    );
  }

  static String _normalizeLocaleTag(String raw) {
    final lower = raw.toLowerCase();
    if (lower.startsWith('zh')) {
      return 'zh-Hans';
    }
    return 'en';
  }

  static ThemeMode _parseThemeMode(String? raw) {
    switch (raw) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }
}
