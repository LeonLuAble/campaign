import 'app_settings.dart';
import 'preferences_store.dart';

/// In-memory store for widget and unit tests.
class MemoryPreferencesStore implements PreferencesStore {
  MemoryPreferencesStore([AppSettings? initial])
      : _settings = initial ?? AppSettings.defaults;

  AppSettings _settings;

  AppSettings get snapshot => _settings;

  @override
  Future<AppSettings> load() async => _settings;

  @override
  Future<void> save(AppSettings settings) async {
    _settings = settings;
  }
}
