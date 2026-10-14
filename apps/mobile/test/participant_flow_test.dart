import 'package:api_client/api_client.dart';
import 'package:community_campaign/app.dart';
import 'package:community_campaign/config/app_config.dart';
import 'package:community_campaign/locale/app_locales.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const config = AppConfig(
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000/api/v1',
  );

  testWidgets('login, join, pledge from API choices, and cancel a recording', (
    tester,
  ) async {
    final api = FakeCampaignApiClient();
    await tester.pumpWidget(
      CampaignApp(
        config: config,
        locale: AppLocales.en,
        apiClient: api,
        tokenStore: MemoryTokenStore(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), 'member@example.com');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    expect(find.text('速素数数'), findsOneWidget);
    await tester.tap(find.text('速素数数'));
    await tester.pumpAndSettle();

    expect(find.text('Join'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Join'));
    await tester.pumpAndSettle();
    expect(find.text('Enrolled'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Pledge'));
    await tester.pumpAndSettle();
    expect(find.text('发愿素'), findsOneWidget);
    expect(find.text('已全素'), findsOneWidget);
    await tester.tap(find.text('一周素'));
    await tester.pumpAndSettle();
    expect(find.text('7'), findsWidgets);
    await tester.tap(find.widgetWithText(FilledButton, 'Save pledge'));
    await tester.pumpAndSettle();
    expect(api.commitments, isNotEmpty);
    expect(api.commitments.first.typeKey, 'yi_zhou_su');

    await tester.tap(find.widgetWithText(OutlinedButton, 'Record meals'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Record'));
    await tester.pumpAndSettle();
    expect(api.actions, isNotEmpty);
    await tester.tap(find.widgetWithText(TextButton, 'Cancel recording'));
    await tester.pumpAndSettle();
    expect(api.actions.first.isCancelled, isTrue);
  });

  testWidgets('shows API error copy for invalid credentials', (tester) async {
    final api = FakeCampaignApiClient()..failLogin = true;
    await tester.pumpWidget(
      CampaignApp(
        config: config,
        locale: AppLocales.en,
        apiClient: api,
        tokenStore: MemoryTokenStore(),
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).at(0), 'member@example.com');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
    expect(
      find.text('Email, mobile, or password is incorrect.'),
      findsOneWidget,
    );
  });
}
