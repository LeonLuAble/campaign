import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:community_campaign_admin/app.dart';
import 'package:community_campaign_admin/config/app_config.dart';

void main() {
  const config = AppConfig(
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000/api/v1',
  );

  testWidgets('shows the English administration shell', (tester) async {
    await tester.pumpWidget(
      const CampaignAdminApp(config: config, locale: Locale('en')),
    );
    await tester.pumpAndSettle();

    expect(find.text('Community Campaign Admin'), findsOneWidget);
    expect(find.text('Administration shell'), findsOneWidget);
    expect(find.text('Environment: test'), findsOneWidget);
  });

  testWidgets('shows the Simplified Chinese administration shell', (
    tester,
  ) async {
    await tester.pumpWidget(
      const CampaignAdminApp(config: config, locale: Locale('zh')),
    );
    await tester.pumpAndSettle();

    expect(find.text('社区活动管理'), findsOneWidget);
    expect(find.text('管理端应用外壳'), findsOneWidget);
    expect(find.text('环境：test'), findsOneWidget);
  });
}
