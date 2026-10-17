import 'package:api_client/api_client.dart';
import 'package:flutter/widgets.dart';

import 'app.dart';
import 'config/app_config.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    CampaignAdminApp(
      config: AppConfig.fromEnvironment(),
      tokenStore: SecureTokenStore(),
    ),
  );
}
