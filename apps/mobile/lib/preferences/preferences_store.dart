import 'app_settings.dart';

/// Persistence for [AppSettings]. Implementations must be safe for tests.
abstract class PreferencesStore {
  Future<AppSettings> load();

  Future<void> save(AppSettings settings);
}
