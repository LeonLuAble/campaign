import 'package:api_client/api_client.dart';
import 'package:flutter/widgets.dart';

import 'app.dart';
import 'config/app_config.dart';
import 'preferences/preferences_controller.dart';
import 'preferences/shared_preferences_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final preferences = PreferencesController(
    store: SharedPreferencesStore(),
  );
  await preferences.load();
  runApp(
    CampaignApp(
      config: AppConfig.fromEnvironment(),
      preferences: preferences,
      locale: preferences.settings.locale,
      tokenStore: SecureTokenStore(),
    ),
  );
}
