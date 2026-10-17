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

  FakeCampaignApiClient adminApi() {
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
    );
  }

  Future<void> signIn(WidgetTester tester) async {
    await tester.enterText(find.byType(TextField).at(0), 'admin@example.com');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
  }

  testWidgets('customer, community, import, campaign, reject, export', (
    tester,
  ) async {
    final api = adminApi();
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
        pickCsv: () async => (
          name: 'members.csv',
          bytes: 'email,mobile\nimported@example.com,\n'.codeUnits,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await signIn(tester);

    expect(find.text('Tzu Chi Malaysia'), findsWidgets);
    expect(find.text('Create customer'), findsWidgets);

    await tester.tap(find.widgetWithText(FilledButton, 'Create customer'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Customer name'),
      'New Tenant',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Next'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Admin display name'),
      'Tenant Admin',
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'Admin email'),
      'tenant.admin@example.com',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Next'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Create customer'));
    await tester.pumpAndSettle();
    expect(find.text('Customer created'), findsOneWidget);
    await tester.tap(find.widgetWithText(TextButton, 'Back to customers'));
    await tester.pumpAndSettle();
    expect(find.text('New Tenant'), findsWidgets);

    await tester.tap(find.byType(DropdownButton<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tzu Chi Malaysia').last);
    await tester.pumpAndSettle();
    Finder navIcon(IconData icon) => find.descendant(
          of: find.byType(NavigationRail),
          matching: find.byIcon(icon),
        );
    await tester.tap(navIcon(Icons.account_tree_outlined));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).first, 'KL Chapter');
    await tester.tap(find.widgetWithText(FilledButton, 'Create community'));
    await tester.pumpAndSettle();
    expect(find.text('KL Chapter'), findsOneWidget);

    await tester.tap(navIcon(Icons.upload_file_outlined));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Upload CSV'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(OutlinedButton, 'Save mapping'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(OutlinedButton, 'Validate'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(OutlinedButton, 'Preview'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Confirm import'));
    await tester.pumpAndSettle();
    expect(find.text('Import result'), findsOneWidget);
    expect(find.text('created'), findsWidgets);

    await tester.tap(navIcon(Icons.flag_outlined));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Create campaign'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'Spring 速素数数');
    await tester.tap(find.widgetWithText(FilledButton, 'Create campaign'));
    await tester.pumpAndSettle();
    expect(find.text('draft'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Publish'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Start'));
    await tester.pumpAndSettle();
    expect(find.text('started'), findsOneWidget);

    final created = api.campaigns.last;
    api.actions = [
      RecordedAction(
        id: 'act-1',
        campaignId: created.id,
        participationId: 'part-1',
        userId: 'user-1',
        actionDefinitionId: 'def-meal',
        occurredOn: '2026-10-14',
        quantity: 1,
        status: 'recorded',
        submission: const Submission(
          id: 'sub-1',
          actionId: 'act-1',
          status: 'approved',
        ),
      ),
    ];
    await tester.tap(find.widgetWithText(OutlinedButton, 'Submissions'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Reject'));
    await tester.pumpAndSettle();

    final reportFinder = find.widgetWithText(OutlinedButton, 'Campaign report');
    if (reportFinder.evaluate().isEmpty) {
      await tester.pageBack();
      await tester.pumpAndSettle();
    }
    await tester.tap(find.widgetWithText(OutlinedButton, 'Campaign report'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Export CSV'));
    await tester.pumpAndSettle();
    expect(find.text('CSV export is ready.'), findsOneWidget);
    expect(find.textContaining('campaign'), findsWidgets);
  });
}
