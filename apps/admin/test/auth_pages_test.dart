import 'package:api_client/api_client.dart';
import 'package:community_campaign_admin/app.dart';
import 'package:community_campaign_admin/config/app_config.dart';
import 'package:community_campaign_admin/locale/app_locales.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  const config = AppConfig(
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000/api/v1',
  );

  Future<void> pumpLoggedOut(WidgetTester tester) async {
    await tester.pumpWidget(
      CampaignAdminApp(
        config: config,
        locale: AppLocales.en,
        apiClient: FakeCampaignApiClient(),
        tokenStore: MemoryTokenStore(),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> go(WidgetTester tester, String location) async {
    final context = tester.element(find.byType(Scaffold).first);
    GoRouter.of(context).go(location);
    await tester.pumpAndSettle();
  }

  testWidgets('forgot password opens request-reset form', (tester) async {
    await pumpLoggedOut(tester);
    await tester.tap(find.text('Forgot password'));
    await tester.pumpAndSettle();

    expect(find.text('Reset password'), findsOneWidget);
    expect(find.textContaining('If an account exists'), findsOneWidget);

    await tester.enterText(find.byType(TextField).first, 'admin@example.com');
    await tester.tap(find.text('Send reset email'));
    await tester.pumpAndSettle();
    expect(find.textContaining('If the account exists'), findsOneWidget);
  });

  testWidgets('activation succeeds and links to login', (tester) async {
    await pumpLoggedOut(tester);
    await go(tester, '/activate?token=activation-token');

    expect(find.text('Activate account'), findsOneWidget);
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.text('Activate'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Your account is activated'), findsOneWidget);
    await tester.tap(find.text('Go to sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Sign in'), findsWidgets);
  });

  testWidgets('activation shows error for invalid or expired token', (
    tester,
  ) async {
    await pumpLoggedOut(tester);
    await go(tester, '/activate?token=invalid');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.text('Activate'));
    await tester.pumpAndSettle();
    expect(find.text('This token is not valid.'), findsOneWidget);

    await tester.enterText(find.byType(TextField).at(0), 'expired');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.text('Activate'));
    await tester.pumpAndSettle();
    expect(find.text('This token has expired.'), findsOneWidget);
  });

  testWidgets('activation validates password policy', (tester) async {
    await pumpLoggedOut(tester);
    await go(tester, '/activate?token=activation-token');
    await tester.enterText(find.byType(TextField).at(1), 'short');
    await tester.tap(find.text('Activate'));
    await tester.pumpAndSettle();
    expect(
      find.text('Password must be at least 8 characters.'),
      findsOneWidget,
    );
  });

  testWidgets('password reset succeeds and links to login', (tester) async {
    await pumpLoggedOut(tester);
    await go(tester, '/reset-password?token=reset-token');

    expect(find.text('Reset password'), findsOneWidget);
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.text('Set new password'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Your password was updated'), findsOneWidget);
    await tester.tap(find.text('Go to sign in'));
    await tester.pumpAndSettle();
    expect(find.text('Sign in'), findsWidgets);
  });

  testWidgets('password reset shows error for invalid or expired token', (
    tester,
  ) async {
    await pumpLoggedOut(tester);
    await go(tester, '/reset-password?token=invalid');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.text('Set new password'));
    await tester.pumpAndSettle();
    expect(find.text('This token is not valid.'), findsOneWidget);

    await tester.enterText(find.byType(TextField).at(0), 'expired');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.text('Set new password'));
    await tester.pumpAndSettle();
    expect(find.text('This token has expired.'), findsOneWidget);
  });

  testWidgets('password reset validates password policy', (tester) async {
    await pumpLoggedOut(tester);
    await go(tester, '/reset-password?token=reset-token');
    await tester.enterText(find.byType(TextField).at(1), 'short');
    await tester.tap(find.text('Set new password'));
    await tester.pumpAndSettle();
    expect(
      find.text('Password must be at least 8 characters.'),
      findsOneWidget,
    );
  });

  testWidgets('public auth routes stay available while logged out', (
    tester,
  ) async {
    await pumpLoggedOut(tester);
    await go(tester, '/activate?token=x');
    expect(find.text('Activate account'), findsOneWidget);
    expect(find.text('Sign in'), findsNothing);

    await go(tester, '/reset-password?token=y');
    expect(find.text('Reset password'), findsOneWidget);
    expect(find.text('Email or mobile'), findsNothing);
  });
}
