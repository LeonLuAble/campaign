import 'package:flutter/widgets.dart';

import '../locale/app_locales.dart';
import 'app_settings.dart';
import 'preferences_store.dart';

/// Loads and persists [AppSettings]. Notify listeners after each change.
class PreferencesController extends ChangeNotifier {
  PreferencesController({required this._store});

  final PreferencesStore _store;
  AppSettings _settings = AppSettings.defaults;
  var _loaded = false;

  AppSettings get settings => _settings;
  bool get isLoaded => _loaded;
  bool get onboardingComplete => _settings.onboardingComplete;

  Future<void> load() async {
    _settings = await _store.load();
    _loaded = true;
    notifyListeners();
  }

  Future<void> setLocaleTag(String localeTag) async {
    final normalized = AppLocales.toApi(AppLocales.fromApi(localeTag));
    if (_settings.localeTag == normalized) {
      return;
    }
    await _persist(_settings.copyWith(localeTag: normalized));
  }

  Future<void> setLocale(Locale locale) async {
    await setLocaleTag(AppLocales.toApi(locale));
  }

  Future<void> completeOnboarding() async {
    if (_settings.onboardingComplete) {
      return;
    }
    await _persist(_settings.copyWith(onboardingComplete: true));
  }

  Future<void> _persist(AppSettings next) async {
    _settings = next;
    await _store.save(next);
    notifyListeners();
  }
}
