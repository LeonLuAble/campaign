import 'package:api_client/api_client.dart';
import 'package:community_campaign/app.dart';
import 'package:community_campaign/campaigns/celebration_banner.dart';
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

const _otherMemberName = 'Alice Other-Member';
const _otherMemberEmail = 'alice.other@example.com';
const _otherMemberPhone = '+60123456789';

FakeCampaignApiClient _m5Api({
  AggregateDashboard? communityDashboard,
  AggregateDashboard? campaignDashboard,
  List<InboxNotification>? notifications,
  List<TimeSeriesPoint>? timeSeries,
  Campaign? campaign,
}) {
  final camp = campaign ??
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
        communityIds: const ['comm-root'],
        configuration: const {'rulesStrategy': 'vegetarian'},
      );
  final series = timeSeries ??
      const [
        TimeSeriesPoint(
          periodStart: '2026-10-12',
          periodEnd: '2026-10-12',
          measurements: [
            MeasurementTotal(sourceUnit: 'days', quantity: 12),
          ],
          outcomes: [],
        ),
        TimeSeriesPoint(
          periodStart: '2026-10-13',
          periodEnd: '2026-10-13',
          measurements: [
            MeasurementTotal(sourceUnit: 'days', quantity: 8),
          ],
          outcomes: [],
        ),
      ];
  final exceededDash = AggregateDashboard(
    scope: 'community',
    progress: const DashboardProgress(
      achievedValue: 12,
      targetValue: 10,
      completionPercent: 120,
      unit: 'days',
      completionStatus: 'exceeded',
      participantCount: 4,
    ),
    measurements: const [MeasurementTotal(sourceUnit: 'days', quantity: 12)],
    outcomes: const [
      OutcomeTotal(
        sourceUnit: 'days',
        outcomeMetric: 'water_liters',
        outcomeUnit: 'L',
        value: 120,
        contributions: [
          OutcomeContribution(
            version: 1,
            factorValue: 10,
            source: 'Tenant-configured citation',
          ),
        ],
      ),
    ],
    timeSeries: series,
    visualization: const VisualizationData(
      type: 'tree',
      displayName: '素心树',
      isActive: true,
      completionPercent: 120,
      unit: 'days',
    ),
  );
  final api = FakeCampaignApiClient(
    campaigns: [camp],
    communities: const [
      Community(
        id: 'comm-root',
        customerId: 'cust-1',
        name: 'Malaysia Region',
        slug: 'malaysia',
        isActive: true,
      ),
      Community(
        id: 'comm-kl',
        customerId: 'cust-1',
        parentId: 'comm-root',
        name: 'Kuala Lumpur Branch',
        slug: 'kl',
        isActive: true,
      ),
      Community(
        id: 'comm-pg',
        customerId: 'cust-1',
        parentId: 'comm-root',
        name: 'Penang Branch',
        slug: 'pg',
        isActive: true,
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
      Participation(
        id: 'part-other',
        customerId: 'cust-1',
        campaignId: 'camp-1',
        userId: 'user-other',
        status: 'enrolled',
      ),
    ],
    communityDashboard: communityDashboard ?? exceededDash,
    campaignDashboard: campaignDashboard ??
        AggregateDashboard(
          scope: 'campaign',
          progress: const DashboardProgress(
            achievedValue: 20,
            targetValue: 10,
            completionPercent: 200,
            unit: 'days',
            completionStatus: 'exceeded',
            participantCount: 4,
          ),
          measurements: const [
            MeasurementTotal(sourceUnit: 'days', quantity: 20),
          ],
          outcomes: exceededDash.outcomes,
          timeSeries: series,
          visualization: exceededDash.visualization,
        ),
    notifications: notifications ??
        const [
          InboxNotification(
            id: 'n-mile',
            customerId: 'cust-1',
            type: 'milestone_achieved',
            title: 'Milestone reached',
            body: 'Your community crossed 50%.',
          ),
        ],
    progress: const ParticipantProgress(
      participationId: 'part-1',
      achievedValue: 12,
      targetValue: 10,
      unit: 'days',
      completionPercent: 120,
      completionStatus: 'exceeded',
    ),
  );
  // Plant PII that must never appear on community/home aggregate screens.
  api.memberships = [
    Membership(
      id: 'm-other',
      customerId: 'cust-1',
      userId: 'user-other',
      communityId: 'comm-kl',
      isActive: true,
      roles: const [
        RoleSummary(id: 'role-member', key: 'member', name: 'Member'),
      ],
      user: const MembershipUserSummary(
        id: 'user-other',
        displayName: _otherMemberName,
        email: _otherMemberEmail,
        mobile: _otherMemberPhone,
        activationStatus: 'active',
      ),
    ),
  ];
  return api;
}

Future<void> _pumpCommunity(
  WidgetTester tester, {
  required FakeCampaignApiClient api,
  Locale locale = AppLocales.en,
  double textScale = 1,
  bool reduceMotion = false,
  String location = '/campaigns/camp-1/community',
}) async {
  final store = MemoryTokenStore();
  api.tokenStore = store;
  await api.login(identifier: 'member@example.com', password: 'password123');
  final session = SessionController(api: api);
  await session.restore();
  session.selectCommunity('comm-root');
  tester.view.physicalSize = const Size(900, 3200);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  if (textScale != 1) {
    tester.platformDispatcher.textScaleFactorTestValue = textScale;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  }
  if (reduceMotion) {
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(
      tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
    );
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

void _assertNoOtherMemberPii(WidgetTester tester) {
  expect(find.textContaining(_otherMemberName), findsNothing);
  expect(find.textContaining(_otherMemberEmail), findsNothing);
  expect(find.textContaining(_otherMemberPhone), findsNothing);
  expect(find.textContaining('user-other'), findsNothing);
  expect(find.textContaining('Leaderboard'), findsNothing);
  expect(find.textContaining('Ranking'), findsNothing);
  expect(find.textContaining('behind'), findsNothing);
}

void main() {
  testWidgets('community view renders tree, TREE, outcomes, and chart', (
    tester,
  ) async {
    final api = _m5Api();
    await _pumpCommunity(tester, api: api);

    expect(find.text('Community'), findsWidgets);
    expect(find.text('Malaysia Region'), findsOneWidget);
    expect(find.text('Kuala Lumpur Branch'), findsOneWidget);
    expect(find.text('Penang Branch'), findsOneWidget);
    expect(find.text('素心树'), findsWidgets);
    expect(find.textContaining('water_liters'), findsWidgets);
    expect(find.textContaining('Tenant-configured citation'), findsWidgets);
    expect(find.text('Chart'), findsOneWidget);
    expect(find.text('Table'), findsOneWidget);
    expect(find.byType(TimeSeriesChart), findsOneWidget);
    expect(find.byType(TreeListView<Community>), findsOneWidget);
    _assertNoOtherMemberPii(tester);
  });

  testWidgets('exceeded progress displays as Exceeded', (tester) async {
    final api = _m5Api();
    await _pumpCommunity(tester, api: api);

    expect(find.text('Exceeded'), findsWidgets);
    _assertNoOtherMemberPii(tester);
  });

  testWidgets('milestone celebration shows calm banner', (tester) async {
    final api = _m5Api();
    await _pumpCommunity(tester, api: api);

    expect(find.text('Milestone reached'), findsOneWidget);
    expect(find.byType(CelebrationBanner), findsOneWidget);
    expect(find.text('OK'), findsOneWidget);
  });

  testWidgets('reduce-motion skips celebration fade animation', (tester) async {
    await tester.pumpWidget(
      const MediaQuery(
        data: MediaQueryData(disableAnimations: true),
        child: MaterialApp(
          home: Scaffold(
            body: CelebrationBanner(
              title: 'Milestone reached',
              body: 'Calm celebration',
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(CelebrationBanner), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(CelebrationBanner),
        matching: find.byType(FadeTransition),
      ),
      findsNothing,
    );
  });

  testWidgets('celebration uses fade when motion is allowed', (tester) async {
    await tester.pumpWidget(
      const MediaQuery(
        data: MediaQueryData(disableAnimations: false),
        child: MaterialApp(
          home: Scaffold(
            body: CelebrationBanner(
              title: 'Milestone reached',
              body: 'Calm celebration',
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    expect(
      find.descendant(
        of: find.byType(CelebrationBanner),
        matching: find.byType(FadeTransition),
      ),
      findsOneWidget,
    );
  });

  testWidgets('chart table mode is the text alternative', (tester) async {
    final api = _m5Api();
    await _pumpCommunity(tester, api: api);

    await tester.tap(find.text('Table'));
    await tester.pumpAndSettle();

    expect(find.textContaining('2026-10-12'), findsWidgets);
    expect(find.textContaining('12'), findsWidgets);
  });

  testWidgets('reduce-motion opens chart in table mode', (tester) async {
    final api = _m5Api();
    await _pumpCommunity(tester, api: api, reduceMotion: true);

    // Table mode lists bucket labels as plain text (chart uses axis painters).
    expect(find.text('2026-10-12 – 2026-10-12'), findsOneWidget);
    expect(find.text('2026-10-13 – 2026-10-13'), findsOneWidget);
  });

  testWidgets('empty communities show empty state', (tester) async {
    final api = _m5Api();
    api.communities = [];
    await _pumpCommunity(tester, api: api);

    expect(find.text('No communities are linked yet.'), findsOneWidget);
  });

  testWidgets('community error state offers retry', (tester) async {
    final api = _FailingCommunityApi();
    await _pumpCommunity(tester, api: api);

    expect(find.textContaining('upstream unavailable'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });

  testWidgets('en community at text scale 2.0 does not overflow', (
    tester,
  ) async {
    final api = _m5Api();
    await _pumpCommunity(tester, api: api, textScale: 2);

    expect(tester.takeException(), isNull);
    expect(find.byType(OverflowBar), findsNothing);
    final overflows = tester.takeException();
    expect(overflows, isNull);
  });

  testWidgets('zh community at text scale 2.0 does not overflow', (
    tester,
  ) async {
    final api = _m5Api();
    await _pumpCommunity(
      tester,
      api: api,
      locale: AppLocales.zhHans,
      textScale: 2,
    );

    expect(tester.takeException(), isNull);
    expect(find.text('社区'), findsWidgets);
    expect(find.text('超额完成'), findsWidgets);
  });

  testWidgets('home summary shows my and community progress with refresh', (
    tester,
  ) async {
    final api = _m5Api();
    await _pumpCommunity(tester, api: api, location: '/');

    expect(find.textContaining('My progress'), findsWidgets);
    expect(find.textContaining('Our community has recorded'), findsWidgets);
    expect(find.textContaining('Next: check in today'), findsWidgets);
    expect(find.text('Community progress'), findsWidgets);
    _assertNoOtherMemberPii(tester);

    await tester.fling(find.byType(RefreshIndicator), const Offset(0, 300), 1000);
    await tester.pumpAndSettle();
    expect(find.textContaining('My progress'), findsWidgets);
  });

  testWidgets('no other member personal data on progress screen', (
    tester,
  ) async {
    final api = _m5Api();
    await _pumpCommunity(
      tester,
      api: api,
      location: '/campaigns/camp-1/progress',
    );

    expect(find.text('Exceeded'), findsWidgets);
    expect(find.text('Community progress'), findsOneWidget);
    _assertNoOtherMemberPii(tester);
  });
}

class _FailingCommunityApi extends FakeCampaignApiClient {
  _FailingCommunityApi()
      : super(
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
              configuration: const {},
            ),
          ],
        );

  @override
  Future<Campaign> getCampaign(String campaignId) async {
    throw ApiException(
      statusCode: 503,
      code: 'UNAVAILABLE',
      message: 'upstream unavailable',
    );
  }
}
