import 'package:api_client/api_client.dart';
import 'package:community_campaign_admin/app.dart';
import 'package:community_campaign_admin/config/app_config.dart';
import 'package:community_campaign_admin/locale/app_locales.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:ui_kit/ui_kit.dart';

void main() {
  const config = AppConfig(
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000/api/v1',
  );

  FakeCampaignApiClient adminApi({CustomerAccess? access}) {
    return FakeCampaignApiClient(
      profile: const UserProfile(
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
      ),
      customers: const [
        Customer(
          id: 'cust-1',
          name: 'Tzu Chi Malaysia',
          slug: 'tzu-chi-malaysia',
          isActive: true,
        ),
        Customer(
          id: 'cust-2',
          name: 'Second Org',
          slug: 'second-org',
          isActive: true,
        ),
      ],
      customerAccess: access ?? FakeCampaignApiClient.defaultTenantAccess,
    );
  }

  Future<void> signIn(WidgetTester tester) async {
    await tester.enterText(find.byType(TextField).at(0), 'admin@example.com');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
  }

  Future<void> pumpApp(
    WidgetTester tester, {
    required FakeCampaignApiClient api,
    Size size = const Size(1440, 1000),
    Locale locale = AppLocales.en,
  }) async {
    final view = tester.view;
    view.physicalSize = size;
    view.devicePixelRatio = 1.0;
    addTearDown(view.resetPhysicalSize);
    addTearDown(view.resetDevicePixelRatio);
    await tester.pumpWidget(
      CampaignAdminApp(
        config: config,
        locale: locale,
        apiClient: api,
        tokenStore: MemoryTokenStore(),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('hides nav items without permission', (tester) async {
    final api = adminApi(
      access: const CustomerAccess(
        roles: [],
        permissionKeys: ['campaigns.read'],
        isTenantLevel: true,
        communityIds: [],
      ),
    );
    await pumpApp(tester, api: api);
    await signIn(tester);

    await tester.tap(find.widgetWithText(ListTile, 'Tzu Chi Malaysia'));
    await tester.pumpAndSettle();

    expect(find.text('Campaigns'), findsWidgets);
    expect(find.text('People'), findsNothing);
    expect(find.text('Imports'), findsNothing);
    expect(find.text('Communities'), findsNothing);
  });

  testWidgets('shell layouts at 1440, 1024, and 768 without overflow', (
    tester,
  ) async {
    final api = adminApi();
    await pumpApp(tester, api: api, size: const Size(1440, 1000));
    await signIn(tester);
    await tester.tap(find.widgetWithText(ListTile, 'Tzu Chi Malaysia'));
    await tester.pumpAndSettle();

    for (final width in [1440.0, 1024.0, 768.0]) {
      final view = tester.view;
      view.physicalSize = Size(width, 1000);
      view.devicePixelRatio = 1.0;
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.byType(AppShell), findsOneWidget);
      expect(find.text('Overview'), findsWidgets);
    }
  });

  testWidgets('customer switcher changes workspace', (tester) async {
    final api = adminApi();
    await pumpApp(tester, api: api);
    await signIn(tester);

    await tester.tap(find.widgetWithText(ListTile, 'Tzu Chi Malaysia'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Tzu Chi Malaysia'), findsWidgets);

    await tester.tap(find.byType(DropdownButton<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Second Org').last);
    await tester.pumpAndSettle();
    expect(find.textContaining('Second Org'), findsWidgets);
  });

  testWidgets('language toggle switches to Chinese', (tester) async {
    final api = adminApi();
    await pumpApp(tester, api: api);
    await signIn(tester);

    await tester.tap(find.text('Language'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('简体中文'));
    await tester.pumpAndSettle();

    expect(find.text('语言'), findsWidgets);
  });

  testWidgets('public auth routes stay outside the shell', (tester) async {
    await pumpApp(tester, api: FakeCampaignApiClient());
    expect(find.text('Sign in'), findsWidgets);
    expect(find.byType(AppShell), findsNothing);

    final context = tester.element(find.byType(Scaffold).first);
    GoRouter.of(context).go('/activate');
    await tester.pumpAndSettle();
    expect(find.byType(AppShell), findsNothing);
    expect(find.text('Activate account'), findsOneWidget);

    GoRouter.of(tester.element(find.byType(Scaffold).first)).go(
      '/reset-password',
    );
    await tester.pumpAndSettle();
    expect(find.byType(AppShell), findsNothing);
    expect(find.text('Reset password'), findsOneWidget);
  });
}
