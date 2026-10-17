import 'package:api_client/api_client.dart';
import 'package:community_campaign_admin/app.dart';
import 'package:community_campaign_admin/config/app_config.dart';
import 'package:community_campaign_admin/locale/app_locales.dart';
import 'package:community_campaign_admin/session/session_controller.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const config = AppConfig(
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000/api/v1',
  );

  const adminProfile = UserProfile(
    id: 'admin-1',
    displayName: 'Admin',
    locale: 'en',
    isActive: true,
    isPlatformAdmin: true,
    identities: [
      UserIdentity(
        id: 'id-1',
        type: 'email',
        identifier: 'admin@example.com',
        isVerified: true,
      ),
    ],
  );

  testWidgets('session survives a rebuild with a persistent token store', (
    tester,
  ) async {
    final store = MemoryTokenStore(
      accessToken: 'access',
      refreshToken: 'refresh',
    );

    final firstApi = FakeCampaignApiClient(
      tokenStore: store,
      profile: adminProfile,
    );
    final firstSession = SessionController(api: firstApi);
    await firstSession.restore();

    await tester.pumpWidget(
      CampaignAdminApp(
        config: config,
        locale: AppLocales.en,
        apiClient: firstApi,
        tokenStore: store,
        session: firstSession,
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Customers'), findsOneWidget);
    expect(store.accessToken, 'access');

    final secondApi = FakeCampaignApiClient(
      tokenStore: store,
      profile: adminProfile,
    );
    final secondSession = SessionController(api: secondApi);
    await secondSession.restore();

    await tester.pumpWidget(
      CampaignAdminApp(
        config: config,
        locale: AppLocales.en,
        apiClient: secondApi,
        tokenStore: store,
        session: secondSession,
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Customers'), findsOneWidget);
    expect(store.accessToken, 'access');
  });

  testWidgets('TOKEN_REUSED logs out and clears the token store', (
    tester,
  ) async {
    final store = MemoryTokenStore(
      accessToken: 'access',
      refreshToken: 'refresh',
    );
    final api = FakeCampaignApiClient(
      tokenStore: store,
      profile: adminProfile,
    );
    final session = SessionController(api: api);
    await session.restore();

    await tester.pumpWidget(
      CampaignAdminApp(
        config: config,
        locale: AppLocales.en,
        apiClient: api,
        tokenStore: store,
        session: session,
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Customers'), findsOneWidget);

    api.tokenReused = true;
    await session.restore();
    await tester.pumpAndSettle();

    expect(store.accessToken, isNull);
    expect(store.refreshToken, isNull);
    expect(session.isAuthenticated, isFalse);
    expect(find.text('Sign in'), findsWidgets);
  });

  testWidgets('sign-out clears the token store', (tester) async {
    final store = MemoryTokenStore(
      accessToken: 'access',
      refreshToken: 'refresh',
    );
    final api = FakeCampaignApiClient(
      tokenStore: store,
      profile: adminProfile,
    );
    final session = SessionController(api: api);
    await session.restore();

    await tester.pumpWidget(
      CampaignAdminApp(
        config: config,
        locale: AppLocales.en,
        apiClient: api,
        tokenStore: store,
        session: session,
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Customers'), findsOneWidget);

    await session.logout();
    await tester.pumpAndSettle();

    expect(store.accessToken, isNull);
    expect(store.refreshToken, isNull);
    expect(find.text('Sign in'), findsWidgets);
  });
}
