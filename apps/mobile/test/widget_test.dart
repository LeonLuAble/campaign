import 'package:api_client/api_client.dart';
import 'package:community_campaign/app.dart';
import 'package:community_campaign/config/app_config.dart';
import 'package:community_campaign/locale/app_locales.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_preferences.dart';

void main() {
  const config = AppConfig(
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000/api/v1',
  );

  testWidgets('shows the English login screen when signed out', (tester) async {
    final preferences = await testPreferences(
      onboardingComplete: true,
      locale: AppLocales.en,
    );
    await tester.pumpWidget(
      CampaignApp(
        config: config,
        preferences: preferences,
        locale: AppLocales.en,
        apiClient: FakeCampaignApiClient(),
        tokenStore: MemoryTokenStore(),
        initialLocation: '/login',
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('Email or mobile'), findsOneWidget);
    expect(find.text('Continue with Google'), findsNothing);
    expect(find.text('Continue with Apple'), findsNothing);
  });

  testWidgets('shows the Simplified Chinese login screen', (tester) async {
    final preferences = await testPreferences(
      onboardingComplete: true,
      locale: AppLocales.zhHans,
    );
    await tester.pumpWidget(
      CampaignApp(
        config: config,
        preferences: preferences,
        locale: AppLocales.zhHans,
        apiClient: FakeCampaignApiClient(),
        tokenStore: MemoryTokenStore(),
        initialLocation: '/login',
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('登录'), findsWidgets);
    expect(find.text('邮箱或手机号'), findsOneWidget);
  });

  testWidgets('shows social buttons only when client IDs are configured', (
    tester,
  ) async {
    final preferences = await testPreferences(onboardingComplete: true);
    await tester.pumpWidget(
      CampaignApp(
        config: const AppConfig(
          environment: 'test',
          apiBaseUrl: 'http://localhost:3000/api/v1',
          googleClientId: 'google-id',
          appleClientId: 'apple-id',
        ),
        preferences: preferences,
        locale: AppLocales.en,
        apiClient: FakeCampaignApiClient(),
        tokenStore: MemoryTokenStore(),
        initialLocation: '/login',
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Continue with Google'), findsOneWidget);
    expect(find.text('Continue with Apple'), findsOneWidget);
  });
}
