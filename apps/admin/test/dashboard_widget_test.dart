import 'package:api_client/api_client.dart';
import 'package:community_campaign_admin/dashboards/aggregate_dashboard_page.dart';
import 'package:community_campaign_admin/l10n/app_localizations.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget wrap(Widget child) {
  return MaterialApp(
    locale: const Locale('en'),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: child,
  );
}

void main() {
  testWidgets('shows an empty campaign dashboard', (tester) async {
    await tester.pumpWidget(
      wrap(const AggregateDashboardPage(scope: 'campaign')),
    );
    await tester.pumpAndSettle();

    expect(find.text('Campaign dashboard'), findsOneWidget);
    expect(find.textContaining('No dashboard data yet'), findsOneWidget);
  });

  testWidgets('renders anonymous campaign totals without rankings', (
    tester,
  ) async {
    const data = AggregateDashboard(
      scope: 'campaign',
      progress: DashboardProgress(
        achievedValue: 5,
        targetValue: 10,
        completionPercent: 50,
        unit: 'days',
        participantCount: 3,
      ),
      measurements: [MeasurementTotal(sourceUnit: 'days', quantity: 5)],
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
          measurements: [MeasurementTotal(sourceUnit: 'days', quantity: 5)],
          outcomes: [],
        ),
      ],
      visualization: VisualizationData(
        type: 'tree',
        displayName: '素心树',
        isActive: true,
        completionPercent: 50,
        unit: 'days',
      ),
    );

    await tester.pumpWidget(
      wrap(const AggregateDashboardPage(scope: 'campaign', data: data)),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('People are not ranked'), findsOneWidget);
    expect(find.text('5 of 10 days'), findsWidgets);
    expect(find.textContaining('leaderboard'), findsNothing);

    await tester.drag(find.byType(ListView).first, const Offset(0, -600));
    await tester.pumpAndSettle();
    expect(find.text('素心树'), findsWidgets);
    expect(find.textContaining('Tenant-configured citation'), findsOneWidget);
  });

  testWidgets('uses the community title for community dashboards', (
    tester,
  ) async {
    await tester.pumpWidget(
      wrap(
        const AggregateDashboardPage(
          scope: 'community',
          communityId: 'comm-1',
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Community dashboard'), findsOneWidget);
  });
}
