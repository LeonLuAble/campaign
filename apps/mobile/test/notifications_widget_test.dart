import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:community_campaign/l10n/app_localizations.dart';
import 'package:community_campaign/notifications/notification_models.dart';
import 'package:community_campaign/notifications/notifications_page.dart';

Widget wrap(Widget child) {
  return MaterialApp(
    locale: const Locale('en'),
    localizationsDelegates: AppLocalizations.localizationsDelegates,
    supportedLocales: AppLocalizations.supportedLocales,
    home: child,
  );
}

void main() {
  testWidgets('shows an empty notifications inbox', (tester) async {
    await tester.pumpWidget(wrap(const NotificationsPage()));
    await tester.pumpAndSettle();
    expect(find.text('Notifications'), findsOneWidget);
    expect(find.text('No notifications yet.'), findsOneWidget);
  });

  testWidgets('renders in-app notification copy from the backend payload', (
    tester,
  ) async {
    await tester.pumpWidget(
      wrap(
        const NotificationsPage(
          items: [
            InAppNotificationData(
              id: 'n1',
              title: 'Campaign started',
              body: '速素数数 has started. You can begin recording actions.',
              read: false,
            ),
          ],
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Campaign started'), findsOneWidget);
    expect(find.textContaining('速素数数'), findsOneWidget);
    expect(find.text('Unread'), findsOneWidget);
  });
}
