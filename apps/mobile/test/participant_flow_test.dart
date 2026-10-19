import 'package:api_client/api_client.dart';
import 'package:community_campaign/app.dart';
import 'package:community_campaign/config/app_config.dart';
import 'package:community_campaign/locale/app_locales.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_preferences.dart';

void main() {
  const config = AppConfig(
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000/api/v1',
  );

  testWidgets('login, join with pledge, then open check-in placeholder', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 2000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final api = FakeCampaignApiClient();
    final store = MemoryTokenStore();
    api.tokenStore = store;
    final preferences = await testPreferences(onboardingComplete: true);
    await tester.pumpWidget(
      CampaignApp(
        config: config,
        preferences: preferences,
        locale: AppLocales.en,
        apiClient: api,
        tokenStore: store,
        initialLocation: '/login',
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), 'member@example.com');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Campaigns'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('速素数数'));
    await tester.pumpAndSettle();

    expect(find.text('Join'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Join'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('一周素'));
    await tester.tap(find.text('一周素'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Review pledge'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Confirm and join'));
    await tester.pumpAndSettle();

    expect(find.text('My participation'), findsOneWidget);
    expect(api.commitments, isNotEmpty);
    expect(api.commitments.first.typeKey, 'yi_zhou_su');

    await tester.tap(find.widgetWithText(FilledButton, 'Daily check-in'));
    await tester.pumpAndSettle();
    expect(find.text('I did it today'), findsOneWidget);
  });

  testWidgets('shows API error copy for invalid credentials', (tester) async {
    final api = FakeCampaignApiClient()..failLogin = true;
    final preferences = await testPreferences(onboardingComplete: true);
    await tester.pumpWidget(
      CampaignApp(
        config: config,
        preferences: preferences,
        locale: AppLocales.en,
        apiClient: api,
        tokenStore: MemoryTokenStore(),
        initialLocation: '/login',
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
