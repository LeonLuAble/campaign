import 'package:go_router/go_router.dart';

import '../auth/login_page.dart';
import '../campaigns/campaign_admin_page.dart';
import '../campaigns/campaign_form_page.dart';
import '../campaigns/campaign_list_page.dart';
import '../campaigns/impact_factors_page.dart';
import '../campaigns/participants_page.dart';
import '../campaigns/submissions_page.dart';
import '../communities/community_list_page.dart';
import '../customers/customer_home_page.dart';
import '../customers/customer_list_page.dart';
import '../dashboards/aggregate_dashboard_page.dart';
import '../imports/csv_import_page.dart';
import '../reports/campaign_report_page.dart';
import '../session/session_controller.dart';

GoRouter createRouter({required SessionController session}) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: session,
    redirect: (context, state) {
      if (!session.ready) {
        return null;
      }
      final loggedIn = session.isAuthenticated;
      final location = state.matchedLocation;
      if (!loggedIn && location != '/login') {
        return '/login';
      }
      if (loggedIn && location == '/login') {
        return '/';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/',
        name: 'home',
        builder: (context, state) => const CustomerListPage(),
      ),
      GoRoute(
        path: '/customers/:customerId',
        name: 'customer',
        builder: (context, state) => CustomerHomePage(
          customerId: state.pathParameters['customerId']!,
        ),
      ),
      GoRoute(
        path: '/customers/:customerId/communities',
        name: 'communities',
        builder: (context, state) => CommunityListPage(
          customerId: state.pathParameters['customerId']!,
        ),
      ),
      GoRoute(
        path: '/customers/:customerId/import',
        name: 'import',
        builder: (context, state) => CsvImportPage(
          customerId: state.pathParameters['customerId']!,
        ),
      ),
      GoRoute(
        path: '/customers/:customerId/campaigns',
        name: 'campaigns',
        builder: (context, state) => AdminCampaignListPage(
          customerId: state.pathParameters['customerId']!,
        ),
      ),
      GoRoute(
        path: '/customers/:customerId/campaigns/new',
        name: 'campaignNew',
        builder: (context, state) => CampaignFormPage(
          customerId: state.pathParameters['customerId']!,
        ),
      ),
      GoRoute(
        path: '/customers/:customerId/campaigns/:campaignId',
        name: 'campaign',
        builder: (context, state) => CampaignAdminPage(
          customerId: state.pathParameters['customerId']!,
          campaignId: state.pathParameters['campaignId']!,
        ),
      ),
      GoRoute(
        path: '/customers/:customerId/campaigns/:campaignId/participants',
        name: 'participants',
        builder: (context, state) => ParticipantsPage(
          campaignId: state.pathParameters['campaignId']!,
        ),
      ),
      GoRoute(
        path: '/customers/:customerId/campaigns/:campaignId/submissions',
        name: 'submissions',
        builder: (context, state) => SubmissionsPage(
          campaignId: state.pathParameters['campaignId']!,
        ),
      ),
      GoRoute(
        path: '/customers/:customerId/campaigns/:campaignId/impact-factors',
        name: 'impactFactors',
        builder: (context, state) => ImpactFactorsPage(
          customerId: state.pathParameters['customerId']!,
          campaignId: state.pathParameters['campaignId']!,
        ),
      ),
      GoRoute(
        path: '/customers/:customerId/campaigns/:campaignId/dashboard',
        name: 'campaignDashboard',
        builder: (context, state) => AggregateDashboardPage(
          scope: 'campaign',
          campaignId: state.pathParameters['campaignId'],
        ),
      ),
      GoRoute(
        path: '/customers/:customerId/communities/:communityId/dashboard',
        name: 'communityDashboard',
        builder: (context, state) => AggregateDashboardPage(
          scope: 'community',
          campaignId: state.uri.queryParameters['campaignId'],
          communityId: state.pathParameters['communityId'],
        ),
      ),
      GoRoute(
        path: '/customers/:customerId/campaigns/:campaignId/report',
        name: 'campaignReport',
        builder: (context, state) => CampaignReportPage(
          campaignId: state.pathParameters['campaignId'],
        ),
      ),
    ],
  );
}
