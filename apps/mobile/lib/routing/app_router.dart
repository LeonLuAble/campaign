import 'package:go_router/go_router.dart';

import '../dashboards/dashboard_models.dart';
import '../dashboards/participant_dashboard_page.dart';
import '../shell/home_page.dart';

GoRouter createRouter({ParticipantDashboardData? dashboardData}) {
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
    ],
  );
}
