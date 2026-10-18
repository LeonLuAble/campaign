import 'package:api_client/api_client.dart';
import 'package:community_campaign/app.dart';
import 'package:community_campaign/config/app_config.dart';
import 'package:community_campaign/locale/app_locales.dart';
import 'package:community_campaign/session/session_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const _config = AppConfig(
  environment: 'test',
  apiBaseUrl: 'http://localhost:3000/api/v1',
);

FakeCampaignApiClient _enrolledApi({
  String submissionReview = 'auto',
  ParticipantProgress? progress,
}) {
  final api = FakeCampaignApiClient(
    campaigns: [
      Campaign(
        id: 'camp-1',
        customerId: 'cust-1',
        templateId: 'tmpl-1',
        scopeId: 'scope-1',
        name: '速素数数',
        status: 'started',
        timezone: 'Asia/Kuala_Lumpur',
        startsOn: '2026-01-01',
        endsOn: '2026-12-31',
        communityIds: const [],
        configuration: {
          'rulesStrategy': 'vegetarian',
          'submissionReview': submissionReview,
        },
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
    progress: progress,
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
  api.fakeToday = '2026-10-14';
  return api;
}

Future<void> _pumpCheckIn(
  WidgetTester tester, {
  required FakeCampaignApiClient api,
  Locale locale = AppLocales.en,
  double textScale = 1,
  String location = '/campaigns/camp-1/check-in',
}) async {
  final store = MemoryTokenStore();
  api.tokenStore = store;
  await api.login(identifier: 'member@example.com', password: 'password123');
  final session = SessionController(api: api);
  await session.restore();
  tester.view.physicalSize = const Size(800, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  if (textScale != 1) {
    tester.platformDispatcher.textScaleFactorTestValue = textScale;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  }
  await tester.pumpWidget(
    CampaignApp(
      config: _config,
      locale: locale,
      apiClient: api,
      tokenStore: store,
      session: session,
      initialLocation: location,
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('successful check-in records today', (tester) async {
    final api = _enrolledApi();
    await _pumpCheckIn(tester, api: api);

    expect(find.text('I did it today'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'I did it today'));
    await tester.pumpAndSettle();

    expect(api.actions, isNotEmpty);
    expect(api.actions.first.occurredOn, '2026-10-14');
    expect(find.text('Recorded'), findsWidgets);
  });

  testWidgets('double-tap does not create duplicate actions', (tester) async {
    final api = _enrolledApi();
    await _pumpCheckIn(tester, api: api);

    final button = find.widgetWithText(FilledButton, 'I did it today');
    await tester.tap(button);
    await tester.tap(button);
    await tester.pumpAndSettle();

    expect(api.actions.where((row) => !row.isCancelled), hasLength(1));
  });

  testWidgets('duplicate day shows calm already-recorded message', (
    tester,
  ) async {
    final api = _enrolledApi();
    await _pumpCheckIn(tester, api: api);

    // UI loaded with no action; seed a conflicting row before the tap.
    api.actions = [
      const RecordedAction(
        id: 'act-1',
        campaignId: 'camp-1',
        participationId: 'part-1',
        userId: 'user-1',
        actionDefinitionId: 'def-day',
        occurredOn: '2026-10-14',
        quantity: 1,
        status: 'recorded',
        submission: Submission(
          id: 'sub-1',
          actionId: 'act-1',
          status: 'approved',
        ),
      ),
    ];
    await tester.tap(find.widgetWithText(FilledButton, 'I did it today'));
    await tester.pumpAndSettle();
    expect(find.text('Already recorded for this day.'), findsOneWidget);
  });

  testWidgets('pending review state is shown for manual campaigns', (
    tester,
  ) async {
    final api = _enrolledApi(submissionReview: 'manual');
    await _pumpCheckIn(tester, api: api);
    await tester.tap(find.widgetWithText(FilledButton, 'I did it today'));
    await tester.pumpAndSettle();
    expect(find.text('Pending review'), findsWidgets);
  });

  testWidgets('rejected state shows reason', (tester) async {
    final api = _enrolledApi()
      ..forceSubmissionStatus = 'rejected'
      ..forceReviewNote = 'Outside campaign rules';
    await _pumpCheckIn(tester, api: api);
    await tester.tap(find.widgetWithText(FilledButton, 'I did it today'));
    await tester.pumpAndSettle();
    expect(find.text('Not counted'), findsWidgets);
    expect(find.textContaining('Outside campaign rules'), findsOneWidget);
  });

  testWidgets('progress history and exceeded display', (tester) async {
    final api = _enrolledApi(
      progress: const ParticipantProgress(
        participationId: 'part-1',
        achievedValue: 12,
        targetValue: 10,
        unit: 'days',
        completionPercent: 120,
        completionStatus: 'exceeded',
      ),
    );
    api.actions = [
      const RecordedAction(
        id: 'act-1',
        campaignId: 'camp-1',
        participationId: 'part-1',
        userId: 'user-1',
        actionDefinitionId: 'def-day',
        occurredOn: '2026-10-13',
        quantity: 1,
        status: 'recorded',
        submission: Submission(
          id: 'sub-1',
          actionId: 'act-1',
          status: 'approved',
        ),
      ),
    ];
    await _pumpCheckIn(
      tester,
      api: api,
      location: '/campaigns/camp-1/progress',
    );

    expect(find.text('Exceeded'), findsWidgets);
    expect(find.text('Check-in history'), findsOneWidget);
    expect(find.text('2026-10-13'), findsOneWidget);
    expect(find.text('Community progress so far'), findsOneWidget);
  });

  testWidgets('offline error shows retry', (tester) async {
    final api = _enrolledApi()..failRecordNetwork = true;
    await _pumpCheckIn(tester, api: api);
    await tester.tap(find.widgetWithText(FilledButton, 'I did it today'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Network error'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });

  testWidgets('en text scale 2.0 no overflow on check-in and progress', (
    tester,
  ) async {
    final api = _enrolledApi(
      progress: const ParticipantProgress(
        participationId: 'part-1',
        achievedValue: 12,
        targetValue: 10,
        unit: 'days',
        completionPercent: 120,
        completionStatus: 'exceeded',
      ),
    );
    await _pumpCheckIn(tester, api: api, textScale: 2);
    expect(tester.takeException(), isNull);
    await tester.tap(find.byTooltip('Progress'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('Exceeded'), findsWidgets);
  });

  testWidgets('zh text scale 2.0 no overflow on check-in', (tester) async {
    final api = _enrolledApi();
    await _pumpCheckIn(
      tester,
      api: api,
      locale: AppLocales.zhHans,
      textScale: 2,
    );
    expect(tester.takeException(), isNull);
    expect(find.text('我今天做到了'), findsOneWidget);
  });
}
