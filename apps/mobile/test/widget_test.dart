import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:community_campaign/app.dart';
import 'package:community_campaign/config/app_config.dart';

void main() {
  const config = AppConfig(
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000/api/v1',
  );

  testWidgets('shows the English application shell', (tester) async {
    await tester.pumpWidget(
      const CampaignApp(config: config, locale: Locale('en')),
    );
    await tester.pumpAndSettle();

    expect(find.text('Community Campaign'), findsOneWidget);
    expect(find.text('Community Campaign Platform'), findsOneWidget);
    expect(find.text('Environment: test'), findsOneWidget);
    expect(find.text('Language'), findsOneWidget);
  });

  testWidgets('shows the Simplified Chinese application shell', (tester) async {
    await tester.pumpWidget(
      const CampaignApp(config: config, locale: Locale('zh')),
    );
    await tester.pumpAndSettle();

    expect(find.text('社区活动'), findsOneWidget);
    expect(find.text('社区活动平台'), findsOneWidget);
    expect(find.text('环境：test'), findsOneWidget);
  });
}
