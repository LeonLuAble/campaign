import 'package:go_router/go_router.dart';

import '../auth/activate_page.dart';
import '../auth/login_page.dart';
import '../auth/password_reset_page.dart';
import '../auth/welcome_page.dart';
import '../campaigns/campaign_detail_page.dart';
import '../campaigns/campaigns_tab_page.dart';
import '../campaigns/check_in_page.dart';
import '../campaigns/join_flow_page.dart';
import '../campaigns/participation_page.dart';
import '../campaigns/progress_page.dart';
import '../dashboards/participant_dashboard_page.dart';
import '../home/home_page.dart';
import '../me/me_page.dart';
import '../notifications/notifications_page.dart';
import '../preferences/preferences_page.dart';
import '../session/session_controller.dart';
import '../shell/mobile_shell.dart';

GoRouter createRouter({
  required SessionController session,
  String? initialLocation,
}) {
  return GoRouter(
    initialLocation: initialLocation ?? '/',
    refreshListenable: session,
    redirect: (context, state) {
      if (!session.ready) {
        return null;
      }
      final loggedIn = session.isAuthenticated;
      final location = state.matchedLocation;
      const publicPaths = {
        '/welcome',
        '/login',
        '/activate',
        '/reset-password',
      };
      final isPublic = publicPaths.contains(location);
      if (!loggedIn && !isPublic) {
        // Surface TOKEN_REUSED on the sign-in screen with a clear message.
        if (session.sessionEndedCode == 'TOKEN_REUSED') {
          return '/login';
        }
        return '/welcome';
      }
      if (loggedIn && isPublic) {
        return '/';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/welcome',
        name: 'welcome',
        builder: (context, state) => const WelcomePage(),
      ),
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
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return MobileShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/',
                name: 'home',
                builder: (context, state) => const HomePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/campaigns',
                name: 'campaigns',
                builder: (context, state) => const CampaignsTabPage(),
                routes: [
                  GoRoute(
                    path: ':campaignId',
                    name: 'campaign',
                    builder: (context, state) => CampaignDetailPage(
                      campaignId: state.pathParameters['campaignId']!,
                    ),
                    routes: [
                      GoRoute(
                        path: 'join',
                        name: 'join',
                        builder: (context, state) => JoinFlowPage(
                          campaignId: state.pathParameters['campaignId']!,
                          changeOnly:
                              state.uri.queryParameters['change'] == '1',
                        ),
                      ),
                      GoRoute(
                        path: 'pledge',
                        name: 'pledge',
                        builder: (context, state) => JoinFlowPage(
                          campaignId: state.pathParameters['campaignId']!,
                          changeOnly: true,
                        ),
                      ),
                      GoRoute(
                        path: 'participation',
                        name: 'participation',
                        builder: (context, state) => ParticipationPage(
                          campaignId: state.pathParameters['campaignId']!,
                        ),
                      ),
                      GoRoute(
                        path: 'check-in',
                        name: 'checkIn',
                        builder: (context, state) => CheckInPage(
                          campaignId: state.pathParameters['campaignId']!,
                        ),
                      ),
                      GoRoute(
                        path: 'record',
                        name: 'record',
                        builder: (context, state) => CheckInPage(
                          campaignId: state.pathParameters['campaignId']!,
                        ),
                      ),
                      GoRoute(
                        path: 'progress',
                        name: 'progress',
                        builder: (context, state) => ProgressPage(
                          campaignId: state.pathParameters['campaignId']!,
                        ),
                      ),
                      GoRoute(
                        path: 'dashboard',
                        name: 'dashboard',
                        builder: (context, state) => ParticipantDashboardPage(
                          campaignId: state.pathParameters['campaignId'],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/me',
                name: 'me',
                builder: (context, state) => const MePage(),
              ),
            ],
          ),
        ],
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
