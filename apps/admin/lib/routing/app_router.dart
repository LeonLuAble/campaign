import 'package:go_router/go_router.dart';

import '../dashboards/aggregate_dashboard_page.dart';
import '../dashboards/dashboard_models.dart';
import '../shell/home_page.dart';

GoRouter createRouter({
  AggregateDashboardData? campaignDashboard,
  AggregateDashboardData? communityDashboard,
}) {
  return GoRouter(
    routes: [
      GoRoute(
        path: '/',
        name: 'home',
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        path: '/campaigns/dashboard',
        name: 'campaignDashboard',
        builder: (context, state) => AggregateDashboardPage(
          scope: 'campaign',
          data: campaignDashboard,
        ),
      ),
      GoRoute(
        path: '/communities/dashboard',
        name: 'communityDashboard',
        builder: (context, state) => AggregateDashboardPage(
          scope: 'community',
          data: communityDashboard,
        ),
      ),
    ],
  );
}
