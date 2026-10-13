import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:community_campaign_admin/dashboards/aggregate_dashboard_page.dart';
import 'package:community_campaign_admin/dashboards/dashboard_models.dart';
import 'package:community_campaign_admin/l10n/app_localizations.dart';

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
    const data = AggregateDashboardData(
      scope: 'campaign',
      progress: DashboardProgress(
        achievedValue: 5,
        targetValue: 10,
        completionPercent: 50,
        unit: 'days',
      ),
      measurements: [
        MeasurementTotal(sourceUnit: 'days', quantity: 5),
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
    expect(find.text('5 of 10 days'), findsOneWidget);
    expect(find.text('素心树'), findsOneWidget);
    expect(find.textContaining('Tenant-configured citation'), findsOneWidget);
    expect(find.text('water_liters: 50 L'), findsOneWidget);
    expect(find.textContaining('leaderboard'), findsNothing);
  });

  testWidgets('uses the community title for community dashboards', (
    tester,
  ) async {
    await tester.pumpWidget(
      wrap(const AggregateDashboardPage(scope: 'community')),
    );
    await tester.pumpAndSettle();
    expect(find.text('Community dashboard'), findsOneWidget);
  });
}
