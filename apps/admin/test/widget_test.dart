import 'package:api_client/api_client.dart';
import 'package:community_campaign_admin/app.dart';
import 'package:community_campaign_admin/config/app_config.dart';
import 'package:community_campaign_admin/locale/app_locales.dart';
import 'package:flutter/material.dart';
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

  testWidgets('shows first admin setup when setup is required', (tester) async {
    final api = FakeCampaignApiClient()..setupRequired = true;
    await tester.pumpWidget(
      CampaignAdminApp(
        config: config,
        locale: AppLocales.en,
        apiClient: api,
        tokenStore: MemoryTokenStore(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('First admin setup'), findsOneWidget);
    expect(find.text('Setup key'), findsOneWidget);
    expect(find.text('Admin email'), findsOneWidget);
    expect(find.text('Confirm password'), findsOneWidget);
    expect(find.text('Create admin'), findsOneWidget);

    await tester.enterText(find.byType(TextField).at(0), 'x' * 32);
    await tester.enterText(find.byType(TextField).at(1), 'admin@example.test');
    await tester.enterText(find.byType(TextField).at(2), 'SetupPassw0rd!');
    await tester.enterText(find.byType(TextField).at(3), 'SetupPassw0rd!');
    await tester.tap(find.text('Create admin'));
    await tester.pumpAndSettle();

    expect(api.setupRequired, isFalse);
    expect(api.signedIn, isTrue);
    expect(find.text('Customers'), findsOneWidget);
  });
}
