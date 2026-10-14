import 'package:api_client/api_client.dart';
import 'package:community_campaign_admin/app.dart';
import 'package:community_campaign_admin/config/app_config.dart';
import 'package:community_campaign_admin/locale/app_locales.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const config = AppConfig(
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000/api/v1',
  );

  testWidgets('shows the English administration login', (tester) async {
    await tester.pumpWidget(
      CampaignAdminApp(
        config: config,
        locale: AppLocales.en,
        apiClient: FakeCampaignApiClient(),
        tokenStore: MemoryTokenStore(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('Email or mobile'), findsOneWidget);
  });

  testWidgets('shows the Simplified Chinese administration login', (
    tester,
  ) async {
    await tester.pumpWidget(
      CampaignAdminApp(
        config: config,
        locale: AppLocales.zhHans,
        apiClient: FakeCampaignApiClient(),
        tokenStore: MemoryTokenStore(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('登录'), findsWidgets);
    expect(find.text('邮箱或手机号'), findsOneWidget);
  });
}
