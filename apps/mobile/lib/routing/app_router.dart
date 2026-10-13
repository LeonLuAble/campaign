import 'package:go_router/go_router.dart';

import '../dashboards/dashboard_models.dart';
import '../dashboards/participant_dashboard_page.dart';
import '../notifications/notification_models.dart';
import '../notifications/notifications_page.dart';
import '../shell/home_page.dart';

GoRouter createRouter({
  ParticipantDashboardData? dashboardData,
  List<InAppNotificationData>? notifications,
}) {
  return GoRouter(
    routes: [
      GoRoute(
        path: '/',
        name: 'home',
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        path: '/dashboard',
        name: 'dashboard',
        builder: (context, state) =>
            ParticipantDashboardPage(data: dashboardData),
      ),
      GoRoute(
        path: '/notifications',
        name: 'notifications',
        builder: (context, state) => NotificationsPage(items: notifications),
      ),
    ],
  );
}
