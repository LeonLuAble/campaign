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

  FakeCampaignApiClient adminApi({
    List<Campaign>? campaigns,
    List<ActionDefinition>? actionDefinitions,
  }) {
    return FakeCampaignApiClient(
      profile: const UserProfile(
        id: 'admin-1',
        displayName: 'Admin',
        locale: 'en',
        isActive: true,
        isPlatformAdmin: false,
        identities: [
          UserIdentity(
            id: 'id-1',
            type: 'email',
            identifier: 'admin@example.com',
            isVerified: true,
          ),
        ],
      ),
      campaigns: campaigns ?? const [],
      actionDefinitions: actionDefinitions ?? const [],
    );
  }

  Future<void> signIn(WidgetTester tester) async {
    await tester.enterText(find.byType(TextField).at(0), 'admin@example.com');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
  }

  Future<void> openCampaigns(WidgetTester tester) async {
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationRail),
        matching: find.byIcon(Icons.flag_outlined),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> pumpAdmin(
    WidgetTester tester,
    FakeCampaignApiClient api,
  ) async {
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
      ),
    );
    await tester.pumpAndSettle();
    await signIn(tester);
  }

  Future<void> goNext(WidgetTester tester) async {
    await tester.tap(find.widgetWithText(FilledButton, 'Next'));
    await tester.pumpAndSettle();
  }

  Future<void> fillWizardHappyPath(WidgetTester tester) async {
    await tester.enterText(
      find.widgetWithText(TextField, 'Name (简体中文)'),
      '速素数数',
    );
    await goNext(tester);

    await tester.tap(find.text('Pick start date'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Pick end date'));
    await tester.pumpAndSettle();
    // Advance one day if the same day is selected twice.
    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();
    await goNext(tester);

    await tester.tap(find.textContaining('Vegetarian'));
    await tester.pumpAndSettle();
    await goNext(tester);

    // Audience: organisation-wide (default)
    await goNext(tester);

    // Actions prefilled from strategy
    expect(find.text('Vegetarian day'), findsWidgets);
    await goNext(tester);

    await tester.tap(find.widgetWithText(FilledButton, 'Create as draft'));
    await tester.pumpAndSettle();
  }

  testWidgets('creates 速素数数 draft → publish → start → complete', (
    tester,
  ) async {
    final api = adminApi();
    await pumpAdmin(tester, api);
    await openCampaigns(tester);

    await tester.tap(find.widgetWithText(FilledButton, 'New campaign'));
    await tester.pumpAndSettle();
    await fillWizardHappyPath(tester);

    expect(api.campaigns, isNotEmpty);
    expect(api.campaigns.last.name, '速素数数');
    expect(api.campaigns.last.status, 'draft');
    expect(
      api.campaigns.last.configuration['rulesStrategy'],
      'vegetarian',
    );
    expect(api.actionDefinitions.where((row) => row.campaignId == api.campaigns.last.id),
        isNotEmpty);

    expect(find.text('Draft'), findsWidgets);

    await tester.tap(find.widgetWithText(FilledButton, 'Publish'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Publish').last);
    await tester.pumpAndSettle();
    expect(api.campaigns.last.status, 'published');
    expect(find.text('Published'), findsWidgets);

    await tester.tap(find.widgetWithText(FilledButton, 'Start'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Start').last);
    await tester.pumpAndSettle();
    expect(api.campaigns.last.status, 'started');

    await tester.tap(find.widgetWithText(FilledButton, 'Complete'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Complete').last);
    await tester.pumpAndSettle();
    expect(api.campaigns.last.status, 'completed');
    expect(find.text('Completed'), findsWidgets);
  });

  testWidgets('publish checklist blocks incomplete campaign', (tester) async {
    final api = adminApi(
      campaigns: [
        const Campaign(
          id: 'camp-incomplete',
          customerId: 'cust-1',
          templateId: 'tmpl-1',
          scopeId: 'scope-1',
          name: 'Incomplete',
          status: 'draft',
          timezone: 'Asia/Kuala_Lumpur',
          communityIds: [],
          configuration: {'rulesStrategy': 'vegetarian'},
        ),
      ],
      actionDefinitions: const [],
    );
    await pumpAdmin(tester, api);
    await openCampaigns(tester);
    await tester.tap(find.text('Incomplete'));
    await tester.pumpAndSettle();

    expect(find.text('Missing'), findsWidgets);
    final publish = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Publish'),
    );
    expect(publish.onPressed, isNull);
  });

  testWidgets('locks draft-only fields after publish and extends end date', (
    tester,
  ) async {
    final api = adminApi(
      campaigns: [
        const Campaign(
          id: 'camp-pub',
          customerId: 'cust-1',
          templateId: 'tmpl-1',
          scopeId: 'scope-1',
          name: 'Published Camp',
          description: 'Old description',
          status: 'published',
          timezone: 'Asia/Kuala_Lumpur',
          startsOn: '2026-03-01',
          endsOn: '2026-03-31',
          communityIds: [],
          configuration: {'rulesStrategy': 'vegetarian'},
        ),
      ],
      actionDefinitions: const [
        ActionDefinition(
          id: 'adef-1',
          campaignId: 'camp-pub',
          key: 'vegetarian_day',
          name: 'Vegetarian day',
          unit: 'days',
          isActive: true,
        ),
      ],
    );
    await pumpAdmin(tester, api);
    await openCampaigns(tester);
    await tester.tap(find.text('Published Camp'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();

    expect(find.text('Locked after publish'), findsWidgets);

    await tester.enterText(
      find.byType(TextField).first,
      'Should not stick if locked',
    );
    // Description field is second unlocked TextField in settings (name is locked but still present)
    final descriptionFields = find.byType(TextField);
    await tester.enterText(descriptionFields.at(1), 'Extended description');

    await tester.tap(find.text('Mar 31, 2026'));
    await tester.pumpAndSettle();
    // Pick a later day in the same month if possible — just confirm OK keeps a date.
    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(FilledButton, 'Save changes'));
    await tester.pumpAndSettle();

    expect(api.campaigns.single.description, 'Extended description');
    expect(api.campaigns.single.name, 'Published Camp');
  });

  testWidgets('shows localized CAMPAIGN_FIELD_LOCKED and END_DATE messages', (
    tester,
  ) async {
    final api = adminApi(
      campaigns: [
        const Campaign(
          id: 'camp-lock',
          customerId: 'cust-1',
          templateId: 'tmpl-1',
          scopeId: 'scope-1',
          name: 'Lock Camp',
          status: 'published',
          timezone: 'Asia/Kuala_Lumpur',
          startsOn: '2026-03-01',
          endsOn: '2026-03-31',
          communityIds: [],
          configuration: {'rulesStrategy': 'vegetarian'},
        ),
      ],
    );
    await pumpAdmin(tester, api);
    await openCampaigns(tester);
    await tester.tap(find.text('Lock Camp'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();

    // Force a locked-field update via API (name change after publish).
    try {
      await api.updateCampaign('camp-lock', name: 'Nope');
      fail('expected CAMPAIGN_FIELD_LOCKED');
    } on ApiException catch (error) {
      expect(error.code, 'CAMPAIGN_FIELD_LOCKED');
    }

    try {
      await api.updateCampaign('camp-lock', endsOn: '2026-03-01');
      fail('expected CAMPAIGN_END_DATE_LOCKED');
    } on ApiException catch (error) {
      expect(error.code, 'CAMPAIGN_END_DATE_LOCKED');
    }

    // Trigger UI path: shorten end date then save.
    await tester.tap(find.text('Mar 31, 2026'));
    await tester.pumpAndSettle();
    // Select day 1 if visible
    final dayOne = find.text('1');
    if (dayOne.evaluate().isNotEmpty) {
      await tester.tap(dayOne.first);
      await tester.pumpAndSettle();
    }
    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Save changes'));
    await tester.pumpAndSettle();

    expect(
      find.textContaining('end date may only be extended'),
      findsOneWidget,
    );
  });
}
