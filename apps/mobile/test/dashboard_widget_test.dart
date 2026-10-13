import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:community_campaign/dashboards/dashboard_models.dart';
import 'package:community_campaign/dashboards/participant_dashboard_page.dart';
import 'package:community_campaign/l10n/app_localizations.dart';

Widget wrap(Widget child) {
  return MaterialApp(
    locale: const Locale('en'),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: child,
  );
}

void main() {
  testWidgets('shows an empty participant dashboard', (tester) async {
    await tester.pumpWidget(wrap(const ParticipantDashboardPage()));
    await tester.pumpAndSettle();

    expect(find.text('My campaign dashboard'), findsOneWidget);
    expect(find.textContaining('No dashboard data yet'), findsOneWidget);
  });

  testWidgets('renders progress, cited outcomes, TREE and time series', (
    tester,
  ) async {
    const data = ParticipantDashboardData(
      progress: DashboardProgress(
        achievedValue: 2,
        targetValue: 10,
        completionPercent: 20,
        unit: 'days',
      ),
      measurements: [
        MeasurementTotal(sourceUnit: 'days', quantity: 2, definitionKey: 'days'),
      ],
      outcomes: [
        OutcomeTotal(
          sourceUnit: 'days',
          outcomeMetric: 'co2_kg',
          outcomeUnit: 'kg',
          value: 4,
          contributions: [
            OutcomeContribution(
              version: 1,
              factorValue: 2,
              source: 'Admin-cited conversion',
            ),
          ],
        ),
      ],
      timeSeries: [
        TimeSeriesPoint(
          periodStart: '2026-10-12',
          periodEnd: '2026-10-18',
          measurements: [
            MeasurementTotal(sourceUnit: 'days', quantity: 2),
          ],
          outcomes: [],
        ),
      ],
      visualization: VisualizationData(
        type: 'tree',
        displayName: '素心树',
        isActive: true,
        completionPercent: 20,
        unit: 'days',
      ),
    );

    await tester.pumpWidget(wrap(const ParticipantDashboardPage(data: data)));
    await tester.pumpAndSettle();

    expect(find.text('2 of 10 days'), findsOneWidget);
    expect(find.text('Completion: 20%'), findsWidgets);
    expect(find.text('素心树'), findsOneWidget);
    expect(find.textContaining('Admin-cited conversion'), findsOneWidget);
    expect(find.text('co2_kg: 4 kg'), findsOneWidget);
    expect(find.text('2026-10-12 – 2026-10-18'), findsOneWidget);
    expect(find.textContaining('ranked'), findsNothing);
    expect(find.textContaining('leaderboard'), findsNothing);
  });
}
