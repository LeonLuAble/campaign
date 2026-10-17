import 'package:api_client/api_client.dart';
import 'package:community_campaign_admin/app.dart';
import 'package:community_campaign_admin/config/app_config.dart';
import 'package:community_campaign_admin/locale/app_locales.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  const config = AppConfig(
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000/api/v1',
  );

  FakeCampaignApiClient platformApi({
    bool isPlatformAdmin = true,
    ApiException? createError,
    ApiException? listError,
  }) {
    final api = FakeCampaignApiClient(
      profile: UserProfile(
        id: 'admin-1',
        displayName: 'Admin',
        locale: 'en',
        isActive: true,
        isPlatformAdmin: isPlatformAdmin,
        identities: const [
          UserIdentity(
            id: 'id-1',
            type: 'email',
            identifier: 'admin@example.com',
            isVerified: true,
          ),
        ],
      ),
      platformCustomerSummaries: const [
        PlatformCustomerSummary(
          id: 'cust-1',
          name: 'Tzu Chi Malaysia',
          slug: 'tzu-chi-malaysia',
          isActive: true,
          createdAt: '2026-01-15T00:00:00.000Z',
          adminCount: 1,
          pendingAdminInvites: 1,
        ),
      ],
    );
    api.platformAdmins['cust-1'] = const [
      FakePlatformAdmin(
        userId: 'admin-cust-1',
        email: 'tenant.admin@example.com',
        displayName: 'Tenant Admin',
        activationStatus: 'pending',
      ),
    ];
    api.createCustomerError = createError;
    api.listPlatformCustomersError = listError;
    return api;
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
  }) async {
    final view = tester.view;
    view.physicalSize = const Size(1400, 1000);
    view.devicePixelRatio = 1.0;
    addTearDown(view.resetPhysicalSize);
    addTearDown(view.resetDevicePixelRatio);
    await tester.pumpWidget(
      CampaignAdminApp(
        config: config,
        locale: AppLocales.en,
        apiClient: api,
        tokenStore: MemoryTokenStore(),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('hides platform customers nav for non-platform users', (
    tester,
  ) async {
    final api = platformApi(isPlatformAdmin: false);
    await pumpApp(tester, api: api);
    await signIn(tester);

    expect(find.text('Platform console'), findsNothing);
    expect(find.text('Create customer'), findsNothing);
    expect(find.text('Overview'), findsWidgets);

    final context = tester.element(find.byType(Scaffold).first);
    GoRouter.of(context).go('/platform/customers');
    await tester.pumpAndSettle();
    expect(find.text('Create customer'), findsNothing);
    expect(
      GoRouter.of(tester.element(find.byType(Scaffold).first))
          .state
          .uri
          .path,
      startsWith('/customers/'),
    );
  });

  testWidgets('wizard validates format-only and shows success', (tester) async {
    final api = platformApi();
    await pumpApp(tester, api: api);
    await signIn(tester);

    await tester.tap(find.widgetWithText(FilledButton, 'Create customer'));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(FilledButton, 'Next'));
    await tester.pumpAndSettle();
    expect(find.text('Enter a name.'), findsOneWidget);

    await tester.enterText(
      find.widgetWithText(TextField, 'Customer name'),
      'New Tenant',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Next'));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(FilledButton, 'Next'));
    await tester.pumpAndSettle();
    expect(find.text('Enter the admin display name.'), findsOneWidget);

    await tester.enterText(
      find.widgetWithText(TextField, 'Admin display name'),
      'Tenant Admin',
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'Admin email'),
      'not-an-email',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Next'));
    await tester.pumpAndSettle();
    expect(find.text('Enter the customer admin email.'), findsOneWidget);

    await tester.enterText(
      find.widgetWithText(TextField, 'Admin email'),
      'tenant.admin@example.com',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Next'));
    await tester.pumpAndSettle();

    expect(find.text('New Tenant'), findsWidgets);
    expect(find.text('tenant.admin@example.com'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Create customer'));
    await tester.pumpAndSettle();

    expect(find.text('Customer created'), findsOneWidget);
    expect(
      find.textContaining('An activation email was sent to'),
      findsOneWidget,
    );
    expect(find.textContaining('tenant.admin@example.com'), findsWidgets);
  });

  testWidgets('wizard shows API error and retry hint', (tester) async {
    final api = platformApi(
      createError: ApiException(
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'FORBIDDEN',
      ),
    );
    await pumpApp(tester, api: api);
    await signIn(tester);

    await tester.tap(find.widgetWithText(FilledButton, 'Create customer'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Customer name'),
      'Blocked Org',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Next'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Admin display name'),
      'Admin',
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'Admin email'),
      'admin@blocked.example',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Next'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Create customer'));
    await tester.pumpAndSettle();

    expect(
      find.text('You do not have permission for this action.'),
      findsOneWidget,
    );
    expect(
      find.textContaining('retry create'),
      findsOneWidget,
    );
  });

  testWidgets('customer detail can resend activation', (tester) async {
    final api = platformApi();
    await pumpApp(tester, api: api);
    await signIn(tester);

    await tester.tap(find.text('Tzu Chi Malaysia').first);
    await tester.pumpAndSettle();

    expect(find.text('Tenant Admin'), findsOneWidget);
    expect(find.text('Pending'), findsWidgets);

    await tester.tap(find.widgetWithText(TextButton, 'Resend activation'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Resend the activation email'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Resend activation'));
    await tester.pumpAndSettle();

    expect(find.text('Activation email sent again.'), findsOneWidget);
    expect(api.resendActivationCalls, isNotEmpty);
    expect(api.resendActivationCalls.first.userId, 'admin-cust-1');
  });

  testWidgets('list shows API error with retry', (tester) async {
    final api = platformApi(
      listError: ApiException(
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'boom',
      ),
    );
    await pumpApp(tester, api: api);
    await signIn(tester);

    expect(find.text('boom'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Retry'), findsOneWidget);
  });
}
