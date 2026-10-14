import 'package:go_router/go_router.dart';

import '../auth/activate_page.dart';
import '../auth/login_page.dart';
import '../auth/password_reset_page.dart';
import '../campaigns/campaign_detail_page.dart';
import '../campaigns/campaign_list_page.dart';
import '../campaigns/pledge_page.dart';
import '../campaigns/progress_page.dart';
import '../campaigns/record_action_page.dart';
import '../dashboards/participant_dashboard_page.dart';
import '../notifications/notifications_page.dart';
import '../preferences/preferences_page.dart';
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
      const publicPaths = {'/login', '/activate', '/reset-password'};
      final isPublic = publicPaths.contains(location);
      if (!loggedIn && !isPublic) {
        return '/login';
      }
      if (loggedIn && isPublic) {
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
        path: '/activate',
        name: 'activate',
        builder: (context, state) => ActivatePage(
          initialToken: state.uri.queryParameters['token'],
        ),
      ),
      GoRoute(
        path: '/reset-password',
        name: 'resetPassword',
        builder: (context, state) => PasswordResetPage(
          initialToken: state.uri.queryParameters['token'],
        ),
      ),
      GoRoute(
        path: '/',
        name: 'home',
        builder: (context, state) => const CampaignListPage(),
      ),
      GoRoute(
        path: '/campaigns/:campaignId',
        name: 'campaign',
        builder: (context, state) => CampaignDetailPage(
          campaignId: state.pathParameters['campaignId']!,
        ),
      ),
      GoRoute(
        path: '/campaigns/:campaignId/pledge',
        name: 'pledge',
        builder: (context, state) => PledgePage(
          campaignId: state.pathParameters['campaignId']!,
        ),
      ),
      GoRoute(
        path: '/campaigns/:campaignId/record',
        name: 'record',
        builder: (context, state) => RecordActionPage(
          campaignId: state.pathParameters['campaignId']!,
        ),
      ),
      GoRoute(
        path: '/campaigns/:campaignId/progress',
        name: 'progress',
        builder: (context, state) => ProgressPage(
          campaignId: state.pathParameters['campaignId']!,
        ),
      ),
      GoRoute(
        path: '/campaigns/:campaignId/dashboard',
        name: 'dashboard',
        builder: (context, state) => ParticipantDashboardPage(
          campaignId: state.pathParameters['campaignId'],
        ),
      ),
      GoRoute(
        path: '/notifications',
        name: 'notifications',
        builder: (context, state) => const NotificationsPage(),
      ),
      GoRoute(
        path: '/preferences',
        name: 'preferences',
        builder: (context, state) => const PreferencesPage(),
      ),
    ],
  );
}
