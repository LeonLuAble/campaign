import 'package:api_client/api_client.dart';
import 'package:community_campaign/app.dart';
import 'package:community_campaign/auth/activate_page.dart';
import 'package:community_campaign/config/app_config.dart';
import 'package:community_campaign/locale/app_locales.dart';
import 'package:community_campaign/session/session_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_kit/ui_kit.dart';

const _config = AppConfig(
  environment: 'test',
  apiBaseUrl: 'http://localhost:3000/api/v1',
);

class _FailingCampaignsApi extends FakeCampaignApiClient {
  @override
  Future<List<Campaign>> listCampaigns(String customerId) async {
    throw ApiException(
      statusCode: 503,
      code: 'UNAVAILABLE',
      message: 'upstream unavailable',
    );
  }
}

Future<void> _pumpApp(
  WidgetTester tester, {
  required CampaignApiClient api,
  TokenStore? tokenStore,
  SessionController? session,
  Locale locale = AppLocales.en,
  String? initialLocation,
}) async {
  await tester.pumpWidget(
    CampaignApp(
      config: _config,
      locale: locale,
      apiClient: api,
      tokenStore: tokenStore ?? MemoryTokenStore(),
      session: session,
      initialLocation: initialLocation,
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _signIn(WidgetTester tester) async {
  await tester.enterText(find.byType(TextField).at(0), 'member@example.com');
  await tester.enterText(find.byType(TextField).at(1), 'password123');
  await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
  await tester.pumpAndSettle();
}

void main() {
  test('extractActivationToken accepts raw tokens and pasted links', () {
    expect(extractActivationToken('abc-token'), 'abc-token');
    expect(
      extractActivationToken('https://app.example/activate?token=inv-42'),
      'inv-42',
    );
    expect(
      extractActivationToken(
        'https://app.example/#/activate?token=frag%2Dtoken',
      ),
      'frag-token',
    );
    expect(extractActivationToken(''), isNull);
  });

  testWidgets('welcome is the signed-out landing screen', (tester) async {
    await _pumpApp(tester, api: FakeCampaignApiClient());

    expect(find.text('Community Campaign'), findsOneWidget);
    expect(find.text('Continue to sign in'), findsOneWidget);
    expect(find.text('Activate account'), findsOneWidget);
    expect(find.text('Sign in'), findsNothing);
  });

  testWidgets('sign-in success lands on Home with campaigns and shell tabs', (
    tester,
  ) async {
    final api = FakeCampaignApiClient(
      communities: const [
        Community(
          id: 'com-1',
          customerId: 'cust-1',
          name: 'KL Chapter',
          slug: 'kl-chapter',
          isActive: true,
        ),
      ],
      customerAccess: const CustomerAccess(
        roles: [
          RoleSummary(id: 'role-member', key: 'member', name: 'Member'),
        ],
        permissionKeys: ['customers.read', 'communities.read', 'campaigns.read'],
        isTenantLevel: false,
        communityIds: ['com-1'],
      ),
    );
    await _pumpApp(tester, api: api, initialLocation: '/login');
    await _signIn(tester);

    expect(find.text('Home'), findsWidgets);
    expect(find.text('Tzu Chi Malaysia'), findsOneWidget);
    expect(find.textContaining('KL Chapter'), findsOneWidget);
    expect(find.text('速素数数'), findsOneWidget);
    expect(find.text('Available to join'), findsOneWidget);
    expect(find.text('Campaigns'), findsWidgets);
    expect(find.text('Me'), findsOneWidget);
  });

  testWidgets('sign-in failure shows invalid credentials copy', (tester) async {
    final api = FakeCampaignApiClient()..failLogin = true;
    await _pumpApp(tester, api: api, initialLocation: '/login');
    await _signIn(tester);

    expect(
      find.text('Email, mobile, or password is incorrect.'),
      findsOneWidget,
    );
    expect(find.text('Home'), findsNothing);
  });

  testWidgets('TOKEN_REUSED signs out with a clear message on login', (
    tester,
  ) async {
    final store = MemoryTokenStore(
      accessToken: 'access',
      refreshToken: 'refresh',
    );
    final api = FakeCampaignApiClient(tokenStore: store);
    final session = SessionController(api: api);
    await session.restore();

    await _pumpApp(
      tester,
      api: api,
      tokenStore: store,
      session: session,
    );
    expect(find.text('Home'), findsWidgets);

    api.tokenReused = true;
    await session.restore();
    await tester.pumpAndSettle();

    expect(session.isAuthenticated, isFalse);
    expect(store.accessToken, isNull);
    expect(find.text('Sign in'), findsWidgets);
    expect(
      find.text('Your session was reused. Please sign in again.'),
      findsOneWidget,
    );
  });

  testWidgets('activation with token then lands on sign-in', (tester) async {
    await _pumpApp(tester, api: FakeCampaignApiClient(), initialLocation: '/activate');

    await tester.enterText(
      find.byType(TextField).at(0),
      'https://example.com/activate?token=invite-ok',
    );
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Activate'));
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('Email or mobile'), findsOneWidget);
  });

  testWidgets('route guard blocks signed-out users from Home', (tester) async {
    await _pumpApp(
      tester,
      api: FakeCampaignApiClient(),
      initialLocation: '/',
    );

    expect(find.text('Continue to sign in'), findsOneWidget);
    expect(find.text('Your campaigns'), findsNothing);
    expect(find.byType(NavigationBar), findsNothing);
  });

  testWidgets('language switch on Me updates UI strings', (tester) async {
    await _pumpApp(tester, api: FakeCampaignApiClient(), initialLocation: '/login');
    await _signIn(tester);

    await tester.tap(find.text('Me'));
    await tester.pumpAndSettle();
    expect(find.text('Sign out'), findsOneWidget);

    await tester.tap(find.text('简体中文'));
    await tester.pumpAndSettle();

    expect(find.text('退出登录'), findsOneWidget);
    expect(find.text('我的'), findsWidgets);
  });

  testWidgets('Home empty state when there are no campaigns', (tester) async {
    final api = FakeCampaignApiClient(campaigns: const []);
    await _pumpApp(tester, api: api, initialLocation: '/login');
    await _signIn(tester);

    expect(find.byType(EmptyState), findsOneWidget);
    expect(find.text('No campaigns yet.'), findsOneWidget);
  });

  testWidgets('Home error state offers retry', (tester) async {
    final api = _FailingCampaignsApi();
    await _pumpApp(tester, api: api, initialLocation: '/login');
    await _signIn(tester);

    expect(find.byType(ErrorState), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
    expect(find.textContaining('upstream unavailable'), findsOneWidget);
  });
}
