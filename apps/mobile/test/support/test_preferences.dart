import 'package:community_campaign/locale/app_locales.dart';
import 'package:community_campaign/preferences/app_settings.dart';
import 'package:community_campaign/preferences/memory_preferences_store.dart';
import 'package:community_campaign/preferences/preferences_controller.dart';
import 'package:flutter/widgets.dart';

Future<PreferencesController> testPreferences({
  bool onboardingComplete = false,
  Locale locale = AppLocales.en,
}) async {
  final controller = PreferencesController(
    store: MemoryPreferencesStore(
      AppSettings(
        schemaVersion: AppSettings.currentSchemaVersion,
        localeTag: AppLocales.toApi(locale),
        onboardingComplete: onboardingComplete,
      ),
    ),
  );
  await controller.load();
  return controller;
}
