import 'package:api_client/api_client.dart';
import 'package:community_campaign/app.dart';
import 'package:community_campaign/config/app_config.dart';
import 'package:community_campaign/locale/app_locales.dart';
import 'package:community_campaign/session/session_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_preferences.dart';

void main() {
  const config = AppConfig(
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000/api/v1',
  );

  testWidgets('session survives a rebuild with a persistent token store', (
    tester,
  ) async {
    final store = MemoryTokenStore(
      accessToken: 'access',
      refreshToken: 'refresh',
    );

    final firstApi = FakeCampaignApiClient(tokenStore: store);
    final firstSession = SessionController(api: firstApi);
    await firstSession.restore();

    final preferences = await testPreferences(onboardingComplete: true);
    await tester.pumpWidget(
      CampaignApp(
        config: config,
        preferences: preferences,
        locale: AppLocales.en,
        apiClient: firstApi,
        tokenStore: store,
        session: firstSession,
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Campaigns'), findsWidgets);
    expect(find.text('Home'), findsWidgets);
    expect(store.accessToken, 'access');

    final secondApi = FakeCampaignApiClient(tokenStore: store);
    final secondSession = SessionController(api: secondApi);
    await secondSession.restore();

    await tester.pumpWidget(
      CampaignApp(
        config: config,
        preferences: preferences,
        locale: AppLocales.en,
        apiClient: secondApi,
        tokenStore: store,
        session: secondSession,
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Campaigns'), findsWidgets);
    expect(store.accessToken, 'access');
  });

  testWidgets('TOKEN_REUSED logs out and clears the token store', (
    tester,
  ) async {
    final store = MemoryTokenStore(
      accessToken: 'access',
      refreshToken: 'refresh',
    );
    final api = FakeCampaignApiClient(tokenStore: store);
    final session = SessionController(api: api);
    await session.restore();

    final preferences = await testPreferences(onboardingComplete: true);
    await tester.pumpWidget(
      CampaignApp(
        config: config,
        preferences: preferences,
        locale: AppLocales.en,
        apiClient: api,
        tokenStore: store,
        session: session,
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Campaigns'), findsWidgets);

    api.tokenReused = true;
    await session.restore();
    await tester.pumpAndSettle();

    expect(store.accessToken, isNull);
    expect(store.refreshToken, isNull);
    expect(session.isAuthenticated, isFalse);
    expect(find.text('Sign in'), findsWidgets);
    expect(
      find.text('Your session was reused. Please sign in again.'),
      findsOneWidget,
    );
  });
}
