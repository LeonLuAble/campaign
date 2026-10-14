import 'package:api_client/api_client.dart';
import 'package:community_campaign_admin/l10n/app_localizations.dart';
import 'package:community_campaign_admin/reports/campaign_report_page.dart';
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
  testWidgets('shows an empty campaign report', (tester) async {
    await tester.pumpWidget(wrap(const CampaignReportPage()));
    await tester.pumpAndSettle();
    expect(find.text('Campaign report'), findsOneWidget);
    expect(find.text('No report data yet.'), findsOneWidget);
  });

  testWidgets('renders aggregate report copy without rankings', (tester) async {
    await tester.pumpWidget(
      wrap(
        const CampaignReportPage(
          data: AggregateDashboard(
            scope: 'campaign',
            progress: DashboardProgress(
              achievedValue: 4,
              targetValue: 10,
              completionPercent: 40,
              unit: 'days',
            ),
            measurements: [],
            outcomes: [],
            timeSeries: [],
            visualization: VisualizationData(
              type: 'tree',
              displayName: '素心树',
              isActive: true,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('exclude contact details'), findsOneWidget);
    expect(find.text('Export CSV'), findsOneWidget);
    expect(find.text('rankings'), findsNothing);
  });
}
