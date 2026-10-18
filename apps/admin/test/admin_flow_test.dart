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
    view.physicalSize = const Size(1600, 1400);
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

    await tester.tap(
      find.widgetWithText(FilledButton, 'Create your first community'),
    );
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Community name'),
      'KL Chapter',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Create'));
    await tester.pumpAndSettle();
    expect(find.text('KL Chapter'), findsOneWidget);

    await tester.tap(navIcon(Icons.upload_file_outlined));
    await tester.pumpAndSettle();
    ScaffoldMessenger.of(tester.element(find.byType(Navigator).first))
        .clearSnackBars();
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'New import'));
    await tester.pumpAndSettle();
    Future<void> tapFilled(String label) async {
      ScaffoldMessenger.of(tester.element(find.byType(Navigator).first))
          .clearSnackBars();
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, label));
      await tester.pumpAndSettle();
    }

    await tapFilled('Upload CSV');
    await tapFilled('Next');
    await tapFilled('Validate');
    await tapFilled('Preview');
    await tapFilled('Next');
    await tapFilled('Confirm import');
    expect(find.text('Import result'), findsOneWidget);
    expect(find.textContaining('Created'), findsWidgets);

    await tester.tap(navIcon(Icons.flag_outlined));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'New campaign'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Name (简体中文)'),
      'Spring 速素数数',
    );
    Future<void> next() async {
      await tester.tap(find.widgetWithText(FilledButton, 'Next'));
      await tester.pumpAndSettle();
    }

    await next();
    await tester.tap(find.text('Pick start date'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Pick end date'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();
    await next();
    await tester.tap(find.textContaining('Vegetarian'));
    await tester.pumpAndSettle();
    await next();
    await next();
    await next();
    await tester.tap(find.widgetWithText(FilledButton, 'Create as draft'));
    await tester.pumpAndSettle();
    expect(find.text('Draft'), findsWidgets);
    await tester.tap(find.widgetWithText(FilledButton, 'Publish'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Publish').last);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Start'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Start').last);
    await tester.pumpAndSettle();
    expect(find.text('Started'), findsWidgets);

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
    await tester.tap(find.text('Submissions'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Reject'));
    await tester.pumpAndSettle();

    final reportsTab = find.descendant(
      of: find.byType(TabBar),
      matching: find.text('Reports'),
    );
    await tester.ensureVisible(reportsTab);
    await tester.tap(reportsTab);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Export CSV').first);
    await tester.pumpAndSettle();
    expect(find.textContaining('CSV download started'), findsOneWidget);
    expect(find.textContaining('campaign'), findsWidgets);
  });
}
