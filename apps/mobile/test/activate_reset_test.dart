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

  testWidgets('activation and password reset screens accept a token', (
    tester,
  ) async {
    await tester.pumpWidget(
      CampaignApp(
        config: config,
        locale: AppLocales.en,
        apiClient: FakeCampaignApiClient(),
        tokenStore: MemoryTokenStore(),
        initialLocation: '/login',
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Activate account'));
    await tester.pumpAndSettle();
    expect(find.text('Activation token'), findsOneWidget);
    await tester.enterText(find.byType(TextField).at(0), 'activation-token');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Activate'));
    await tester.pumpAndSettle();
    expect(find.text('Sign in'), findsWidgets);

    await tester.tap(find.text('Forgot password'));
    await tester.pumpAndSettle();
    expect(find.text('Reset password'), findsWidgets);
    await tester.enterText(find.byType(TextField).at(0), 'member@example.com');
    await tester.tap(find.widgetWithText(OutlinedButton, 'Send reset email'));
    await tester.pumpAndSettle();
    expect(find.textContaining('If the account exists'), findsOneWidget);
  });
}
