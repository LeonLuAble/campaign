import 'package:api_client/api_client.dart';
import 'package:community_campaign/app.dart';
import 'package:community_campaign/config/app_config.dart';
import 'package:community_campaign/locale/app_locales.dart';
import 'package:community_campaign/session/session_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_preferences.dart';

const _config = AppConfig(
  environment: 'test',
  apiBaseUrl: 'http://localhost:3000/api/v1',
);

Future<void> _pumpSignedIn(
  WidgetTester tester, {
  required FakeCampaignApiClient api,
  Locale locale = AppLocales.en,
  String location = '/campaigns/camp-1',
  double textScale = 1,
}) async {
  final store = MemoryTokenStore();
  api.tokenStore = store;
  await api.login(identifier: 'member@example.com', password: 'password123');
  final session = SessionController(api: api);
  await session.restore();
  tester.view.physicalSize = const Size(800, 2000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  if (textScale != 1) {
    tester.platformDispatcher.textScaleFactorTestValue = textScale;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  }
  final preferences = await testPreferences(
    onboardingComplete: true,
    locale: locale,
  );
  await tester.pumpWidget(
    CampaignApp(
      config: _config,
      preferences: preferences,
      locale: locale,
      apiClient: api,
      tokenStore: store,
      session: session,
      initialLocation: location,
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _completeYiZhouSuJoin(WidgetTester tester) async {
  await tester.tap(find.widgetWithText(FilledButton, 'Join'));
  await tester.pumpAndSettle();
  await tester.ensureVisible(find.text('一周素'));
  await tester.tap(find.text('一周素'));
  await tester.pumpAndSettle();
  await tester.tap(find.widgetWithText(FilledButton, 'Review pledge'));
  await tester.pumpAndSettle();
  expect(find.textContaining('一周素'), findsWidgets);
  await tester.tap(find.widgetWithText(FilledButton, 'Confirm and join'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('campaign detail renders strategy, dates, and aggregate progress', (
    tester,
  ) async {
    final api = FakeCampaignApiClient(
      campaigns: [
        Campaign(
          id: 'camp-1',
          customerId: 'cust-1',
          templateId: 'tmpl-1',
          scopeId: 'scope-1',
          name: '速素数数',
          description: 'A community vegetarian observance.',
          status: 'started',
          timezone: 'Asia/Kuala_Lumpur',
          startsOn: '2026-01-01',
          endsOn: '2026-12-31',
          communityIds: const [],
          configuration: const {'rulesStrategy': 'vegetarian'},
        ),
      ],
    );
    await _pumpSignedIn(tester, api: api);

    expect(find.text('速素数数'), findsWidgets);
    expect(find.textContaining('A community vegetarian observance'), findsOneWidget);
    expect(find.textContaining('2026-01-01'), findsWidgets);
    expect(find.text('How it works'), findsOneWidget);
    expect(find.textContaining('Vegetarian'), findsWidgets);
    expect(find.text('Community progress so far'), findsOneWidget);
    expect(find.text('Join'), findsOneWidget);
  });

  testWidgets('join success with 一周素 lands on participation', (tester) async {
    final api = FakeCampaignApiClient();
    await _pumpSignedIn(tester, api: api);
    await _completeYiZhouSuJoin(tester);

    expect(find.text('My participation'), findsOneWidget);
    expect(find.text('一周素'), findsOneWidget);
    expect(find.text('Daily check-in'), findsOneWidget);
    expect(api.participations, isNotEmpty);
    expect(api.commitments.first.typeKey, 'yi_zhou_su');
    expect(api.commitments.first.targetValue, 7);
  });

  testWidgets('已全素 uses campaign duration as the target', (tester) async {
    final api = FakeCampaignApiClient();
    await _pumpSignedIn(tester, api: api);
    await tester.tap(find.widgetWithText(FilledButton, 'Join'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('已全素'));
    await tester.tap(find.text('已全素'));
    await tester.pumpAndSettle();
    expect(find.textContaining('365'), findsWidgets);
    await tester.tap(find.widgetWithText(FilledButton, 'Review pledge'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Confirm and join'));
    await tester.pumpAndSettle();
    expect(api.commitments.first.typeKey, 'yi_quan_su');
    expect(api.commitments.first.targetValue, 365);
  });

  testWidgets('already-joined path opens participation without rejoining', (
    tester,
  ) async {
    final api = FakeCampaignApiClient(
      participations: const [
        Participation(
          id: 'part-1',
          customerId: 'cust-1',
          campaignId: 'camp-1',
          userId: 'user-1',
          status: 'enrolled',
        ),
      ],
    );
    api.commitments = const [
      Commitment(
        id: 'c1',
        participationId: 'part-1',
        typeKey: 'yi_zhou_su',
        targetValue: 7,
        unit: 'days',
      ),
    ];
    await _pumpSignedIn(tester, api: api);

    expect(find.text('View my participation'), findsOneWidget);
    expect(find.text('Join'), findsNothing);
    await tester.tap(find.widgetWithText(FilledButton, 'View my participation'));
    await tester.pumpAndSettle();
    expect(find.text('一周素'), findsOneWidget);
  });

  testWidgets('join CONFLICT shows already-joined copy with a way back', (
    tester,
  ) async {
    final api = FakeCampaignApiClient()
      ..joinFailureCode = 'CONFLICT'
      ..joinFailureMessage = 'User is already enrolled in this campaign';
    await _pumpSignedIn(tester, api: api, location: '/campaigns/camp-1/join');
    await tester.ensureVisible(find.text('一周素'));
    await tester.tap(find.text('一周素'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Review pledge'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Confirm and join'));
    await tester.pumpAndSettle();
    expect(find.text('You have already joined this campaign.'), findsOneWidget);
    expect(find.text('Back to campaign'), findsWidgets);
  });

  testWidgets('campaign not open shows localized error without dead end', (
    tester,
  ) async {
    final api = FakeCampaignApiClient(
      campaigns: [
        Campaign(
          id: 'camp-1',
          customerId: 'cust-1',
          templateId: 'tmpl-1',
          scopeId: 'scope-1',
          name: 'Draft camp',
          status: 'draft',
          timezone: 'Asia/Kuala_Lumpur',
          startsOn: '2026-01-01',
          endsOn: '2026-12-31',
          communityIds: const [],
          configuration: const {'rulesStrategy': 'vegetarian'},
        ),
      ],
    );
    await _pumpSignedIn(tester, api: api);
    expect(find.text('This campaign is not open for joining yet.'), findsOneWidget);
    expect(find.text('Back to campaign'), findsNothing);
  });

  testWidgets('ended campaign shows localized ended copy', (tester) async {
    final api = FakeCampaignApiClient(
      campaigns: [
        Campaign(
          id: 'camp-1',
          customerId: 'cust-1',
          templateId: 'tmpl-1',
          scopeId: 'scope-1',
          name: 'Past camp',
          status: 'completed',
          timezone: 'Asia/Kuala_Lumpur',
          startsOn: '2025-01-01',
          endsOn: '2025-12-31',
          communityIds: const [],
          configuration: const {'rulesStrategy': 'vegetarian'},
        ),
      ],
    );
    await _pumpSignedIn(tester, api: api);
    expect(find.text('This campaign has ended.'), findsOneWidget);
  });

  testWidgets('not-eligible join error offers a way back', (tester) async {
    final api = FakeCampaignApiClient()..failJoinNotEligible = true;
    await _pumpSignedIn(tester, api: api, location: '/campaigns/camp-1/join');
    await tester.ensureVisible(find.text('一周素'));
    await tester.tap(find.text('一周素'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Review pledge'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Confirm and join'));
    await tester.pumpAndSettle();
    expect(
      find.textContaining('not eligible'),
      findsOneWidget,
    );
    expect(find.text('Back to campaign'), findsWidgets);
  });

  testWidgets('Campaigns tab sections: Joined, Open to join, Past', (
    tester,
  ) async {
    final api = FakeCampaignApiClient(
      campaigns: [
        Campaign(
          id: 'camp-1',
          customerId: 'cust-1',
          templateId: 'tmpl-1',
          scopeId: 'scope-1',
          name: 'Joined camp',
          status: 'started',
          timezone: 'Asia/Kuala_Lumpur',
          startsOn: '2026-01-01',
          endsOn: '2026-12-31',
          communityIds: const [],
          configuration: const {'rulesStrategy': 'vegetarian'},
        ),
        Campaign(
          id: 'camp-2',
          customerId: 'cust-1',
          templateId: 'tmpl-1',
          scopeId: 'scope-1',
          name: 'Open camp',
          status: 'published',
          timezone: 'Asia/Kuala_Lumpur',
          startsOn: '2026-02-01',
          endsOn: '2026-02-28',
          communityIds: const [],
          configuration: const {'rulesStrategy': 'vegetarian'},
        ),
        Campaign(
          id: 'camp-3',
          customerId: 'cust-1',
          templateId: 'tmpl-1',
          scopeId: 'scope-1',
          name: 'Past camp',
          status: 'completed',
          timezone: 'Asia/Kuala_Lumpur',
          startsOn: '2025-01-01',
          endsOn: '2025-06-30',
          communityIds: const [],
          configuration: const {'rulesStrategy': 'vegetarian'},
        ),
      ],
      participations: const [
        Participation(
          id: 'part-1',
          customerId: 'cust-1',
          campaignId: 'camp-1',
          userId: 'user-1',
          status: 'enrolled',
        ),
      ],
    );
    await _pumpSignedIn(tester, api: api, location: '/campaigns');

    expect(find.text('Joined'), findsOneWidget);
    expect(find.text('Open to join'), findsOneWidget);
    expect(find.text('Past'), findsOneWidget);
    expect(find.text('Joined camp'), findsOneWidget);
    expect(find.text('Open camp'), findsOneWidget);
    expect(find.text('Past camp'), findsOneWidget);
  });

  testWidgets('detail and join do not overflow at en text scale 2.0', (
    tester,
  ) async {
    final api = FakeCampaignApiClient();
    await _pumpSignedIn(tester, api: api, textScale: 2);
    expect(tester.takeException(), isNull);
    await tester.tap(find.widgetWithText(FilledButton, 'Join'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.text('一周素'));
    await tester.tap(find.text('一周素'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Review pledge'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('detail and join do not overflow at zh text scale 2.0', (
    tester,
  ) async {
    final api = FakeCampaignApiClient();
    await _pumpSignedIn(
      tester,
      api: api,
      locale: AppLocales.zhHans,
      textScale: 2,
    );
    expect(tester.takeException(), isNull);
    await tester.tap(find.widgetWithText(FilledButton, '参加'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.text('一周素'));
    await tester.tap(find.text('一周素'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, '预览承诺'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
