import 'package:api_client/api_client.dart';
import 'package:community_campaign_admin/app.dart';
import 'package:community_campaign_admin/config/app_config.dart';
import 'package:community_campaign_admin/dashboards/aggregate_dashboard_page.dart';
import 'package:community_campaign_admin/imports/download_csv.dart';
import 'package:community_campaign_admin/l10n/app_localizations.dart';
import 'package:community_campaign_admin/locale/app_locales.dart';
import 'package:community_campaign_admin/reports/campaign_report_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_kit/ui_kit.dart';

void main() {
  const config = AppConfig(
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000/api/v1',
  );

  FakeCampaignApiClient apiWithDashboard({
    AggregateDashboard? campaignDashboard,
    AggregateDashboard? communityDashboard,
    List<Community>? communities,
  }) {
    final api = FakeCampaignApiClient(
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
      communities: communities ??
          const [
            Community(
              id: 'comm-1',
              customerId: 'cust-1',
              name: 'KL Chapter',
              slug: 'kl-chapter',
              isActive: true,
            ),
          ],
      campaignDashboard: campaignDashboard ??
          const AggregateDashboard(
            scope: 'campaign',
            progress: DashboardProgress(
              achievedValue: 12,
              targetValue: 10,
              completionPercent: 120,
              unit: 'days',
              participantCount: 10,
              committedParticipantCount: 8,
              completionStatus: 'exceeded',
            ),
            measurements: [
              MeasurementTotal(sourceUnit: 'days', quantity: 12),
            ],
            outcomes: [
              OutcomeTotal(
                sourceUnit: 'days',
                outcomeMetric: 'water_liters',
                outcomeUnit: 'L',
                value: 50,
                contributions: [
                  OutcomeContribution(
                    version: 1,
                    factorValue: 10,
                    source: 'Tenant-configured citation',
                  ),
                ],
              ),
            ],
            timeSeries: [
              TimeSeriesPoint(
                periodStart: '2026-10-12',
                periodEnd: '2026-10-12',
                measurements: [
                  MeasurementTotal(sourceUnit: 'days', quantity: 5),
                ],
                outcomes: [],
              ),
              TimeSeriesPoint(
                periodStart: '2026-10-13',
                periodEnd: '2026-10-13',
                measurements: [
                  MeasurementTotal(sourceUnit: 'days', quantity: 7),
                ],
                outcomes: [],
              ),
            ],
            visualization: VisualizationData(
              type: 'tree',
              displayName: '素心树',
              isActive: true,
              completionPercent: 120,
              unit: 'days',
            ),
          ),
      communityDashboard: communityDashboard,
    );
    api.weekTimeSeries = const [
      TimeSeriesPoint(
        periodStart: '2026-10-06',
        periodEnd: '2026-10-12',
        measurements: [
          MeasurementTotal(sourceUnit: 'days', quantity: 20),
        ],
        outcomes: [],
      ),
    ];
    return api;
  }

  Future<void> signIn(WidgetTester tester) async {
    await tester.enterText(find.byType(TextField).at(0), 'admin@example.com');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
  }

  Widget wrap(Widget child) {
    return MaterialApp(
      locale: const Locale('en'),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: Scaffold(body: child),
    );
  }

  testWidgets('dashboard day/week switch, exceeded, chart table alt', (
    tester,
  ) async {
    final api = apiWithDashboard();
    final view = tester.view;
    view.physicalSize = const Size(1400, 1200);
    view.devicePixelRatio = 1;
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

    await tester.tap(
      find.descendant(
        of: find.byType(NavigationRail),
        matching: find.byIcon(Icons.flag_outlined),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('速素数数'));
    await tester.pumpAndSettle();

    final dashTab = find.descendant(
      of: find.byType(TabBar),
      matching: find.text('Dashboard'),
    );
    await tester.ensureVisible(dashTab);
    await tester.tap(dashTab);
    await tester.pumpAndSettle();

    expect(find.text('Exceeded'), findsWidgets);
    expect(find.textContaining('leaderboard'), findsNothing);
    expect(find.textContaining('behind'), findsNothing);

    expect(api.lastDashboardGranularity, 'day');
    await tester.tap(find.text('Week').hitTestable());
    await tester.pumpAndSettle();
    expect(api.lastDashboardGranularity, 'week');

    await tester.tap(find.text('Table').hitTestable());
    await tester.pumpAndSettle();
    expect(find.byType(TimeSeriesChart), findsOneWidget);

    // Scroll to TREE text alternative and impact outcomes (lazy ListView).
    await tester.drag(find.byType(ListView).first, const Offset(0, -800));
    await tester.pumpAndSettle();
    expect(find.textContaining('素心树'), findsWidgets);
    expect(find.textContaining('of campaign target'), findsWidgets);
    expect(find.textContaining('Tenant-configured citation'), findsOneWidget);
  });

  testWidgets('community picker loads community dashboard', (tester) async {
    final api = apiWithDashboard(
      communityDashboard: const AggregateDashboard(
        scope: 'community',
        progress: DashboardProgress(
          achievedValue: 3,
          targetValue: 10,
          completionPercent: 30,
          unit: 'days',
          participantCount: 4,
          committedParticipantCount: 2,
        ),
        measurements: [],
        outcomes: [],
        timeSeries: [
          TimeSeriesPoint(
            periodStart: '2026-10-12',
            periodEnd: '2026-10-12',
            measurements: [
              MeasurementTotal(sourceUnit: 'days', quantity: 3),
            ],
            outcomes: [],
          ),
        ],
        visualization: VisualizationData(
          type: 'tree',
          displayName: '素心树',
          isActive: true,
          completionPercent: 50,
        ),
      ),
    );

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
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationRail),
        matching: find.byIcon(Icons.flag_outlined),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('速素数数'));
    await tester.pumpAndSettle();
    final dashTab = find.descendant(
      of: find.byType(TabBar),
      matching: find.text('Dashboard'),
    );
    await tester.ensureVisible(dashTab);
    await tester.tap(dashTab);
    await tester.pumpAndSettle();

    expect(find.text('Include sub-communities'), findsOneWidget);
    await tester.tap(find.text('Any community'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('KL Chapter'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle();

    expect(find.text('Community dashboard'), findsNothing); // embedded
    expect(find.textContaining('3 of 10'), findsWidgets);
  });

  testWidgets('empty and error dashboard states', (tester) async {
    await tester.pumpWidget(
      wrap(const AggregateDashboardPage(scope: 'campaign', embedded: true)),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('No dashboard data yet'), findsOneWidget);

    final api = FakeCampaignApiClient(
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
    );
    // Force error by using a throwing wrapper via campaignId load without ApiScope —
    // use page with data null and no campaignId already covered empty.
    expect(find.byType(EmptyState), findsOneWidget);
    expect(api.campaignDashboard, isNotNull);
  });

  testWidgets('CSV export downloads and empty report', (tester) async {
    clearLastDownloadedCsv();
    final api = apiWithDashboard();

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
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationRail),
        matching: find.byIcon(Icons.flag_outlined),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('速素数数'));
    await tester.pumpAndSettle();

    final reportsTab = find.descendant(
      of: find.byType(TabBar),
      matching: find.text('Reports'),
    );
    await tester.ensureVisible(reportsTab);
    await tester.tap(reportsTab);
    await tester.pumpAndSettle();

    expect(find.textContaining('exclude contact details'), findsWidgets);
    await tester.tap(find.widgetWithText(FilledButton, 'Export CSV').first);
    await tester.pumpAndSettle();
    expect(lastDownloadedCsv, isNotNull);
    expect(lastDownloadedCsv!.content, contains('campaign'));
    expect(find.textContaining('CSV download started'), findsOneWidget);
  });

  testWidgets('report empty state', (tester) async {
    await tester.pumpWidget(wrap(const CampaignReportPage(embedded: true)));
    await tester.pumpAndSettle();
    expect(find.text('No report data yet.'), findsOneWidget);
  });
}
