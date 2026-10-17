import 'package:go_router/go_router.dart';

import '../auth/activate_page.dart';
import '../auth/login_page.dart';
import '../auth/password_reset_page.dart';
import '../campaigns/campaign_list_page.dart';
import '../campaigns/campaign_wizard_page.dart';
import '../campaigns/campaign_workspace_page.dart';
import '../campaigns/impact_factors_page.dart';
import '../campaigns/participants_page.dart';
import '../campaigns/submissions_page.dart';
import '../communities/community_list_page.dart';
import '../dashboards/aggregate_dashboard_page.dart';
import '../imports/import_wizard_page.dart';
import '../imports/imports_page.dart';
import '../overview/overview_page.dart';
import '../people/people_page.dart';
import '../people/roles_page.dart';
import '../platform/create_customer_wizard_page.dart';
import '../platform/platform_customer_detail_page.dart';
import '../platform/platform_customers_page.dart';
import '../reports/campaign_report_page.dart';
import '../reports/reports_list_page.dart';
import '../session/session_controller.dart';
import '../shell/admin_shell.dart';

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
      if (loggedIn && location == '/login') {
        if (session.isPlatformAdmin) {
          return '/platform/customers';
        }
        final customerId = session.customer?.id ??
            (session.customers.isNotEmpty ? session.customers.first.id : null);
        if (customerId != null) {
          return '/customers/$customerId';
        }
        return '/platform/customers';
      }
      if (loggedIn &&
          (location == '/' || location.startsWith('/platform/')) &&
          !session.isPlatformAdmin) {
        final customerId = session.customer?.id ??
            (session.customers.isNotEmpty ? session.customers.first.id : null);
        if (customerId != null) {
          return '/customers/$customerId';
        }
        return '/login';
      }
      if (loggedIn && location == '/' && session.isPlatformAdmin) {
        return '/platform/customers';
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
      // Branch default locations cannot include path parameters.
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AdminShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/',
                name: 'home',
                redirect: (context, state) {
                  if (session.isPlatformAdmin) {
                    return '/platform/customers';
                  }
                  final id = session.customer?.id ??
                      (session.customers.isNotEmpty
                          ? session.customers.first.id
                          : null);
                  return id == null ? '/login' : '/customers/$id';
                },
              ),
              GoRoute(
                path: '/platform/customers',
                name: 'platformCustomers',
                redirect: (context, state) {
                  if (!session.isPlatformAdmin) {
                    final id = session.customer?.id ??
                        (session.customers.isNotEmpty
                            ? session.customers.first.id
                            : null);
                    return id == null ? '/login' : '/customers/$id';
                  }
                  return null;
                },
                builder: (context, state) => const PlatformCustomersPage(),
              ),
              GoRoute(
                path: '/platform/customers/new',
                name: 'platformCustomerNew',
                redirect: (context, state) {
                  if (!session.isPlatformAdmin) {
                    final id = session.customer?.id ??
                        (session.customers.isNotEmpty
                            ? session.customers.first.id
                            : null);
                    return id == null ? '/login' : '/customers/$id';
                  }
                  return null;
                },
                builder: (context, state) =>
                    const CreateCustomerWizardPage(),
              ),
              GoRoute(
                path: '/platform/customers/:customerId',
                name: 'platformCustomerDetail',
                redirect: (context, state) {
                  if (!session.isPlatformAdmin) {
                    final id = session.customer?.id ??
                        (session.customers.isNotEmpty
                            ? session.customers.first.id
                            : null);
                    return id == null ? '/login' : '/customers/$id';
                  }
                  return null;
                },
                builder: (context, state) => PlatformCustomerDetailPage(
                  customerId: state.pathParameters['customerId']!,
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/customers',
                redirect: (context, state) {
                  if (state.uri.path != '/customers') {
                    return null;
                  }
                  final id = session.customer?.id ??
                      (session.customers.isNotEmpty
                          ? session.customers.first.id
                          : null);
                  return id == null ? '/' : '/customers/$id';
                },
                routes: [
                  GoRoute(
                    path: ':customerId',
                    name: 'overview',
                    builder: (context, state) => OverviewPage(
                      customerId: state.pathParameters['customerId']!,
                    ),
                    routes: [
                      GoRoute(
                        path: 'people',
                        name: 'people',
                        builder: (context, state) => PeoplePage(
                          customerId: state.pathParameters['customerId']!,
                        ),
                        routes: [
                          GoRoute(
                            path: 'roles',
                            name: 'roles',
                            builder: (context, state) => RolesPage(
                              customerId:
                                  state.pathParameters['customerId']!,
                            ),
                          ),
                        ],
                      ),
                      GoRoute(
                        path: 'communities',
                        name: 'communities',
                        builder: (context, state) => CommunityListPage(
                          customerId: state.pathParameters['customerId']!,
                        ),
                        routes: [
                          GoRoute(
                            path: ':communityId/dashboard',
                            name: 'communityDashboard',
                            builder: (context, state) =>
                                AggregateDashboardPage(
                              scope: 'community',
                              campaignId:
                                  state.uri.queryParameters['campaignId'],
                              communityId:
                                  state.pathParameters['communityId'],
                            ),
                          ),
                        ],
                      ),
                      GoRoute(
                        path: 'import',
                        name: 'import',
                        builder: (context, state) => ImportsPage(
                          customerId: state.pathParameters['customerId']!,
                        ),
                        routes: [
                          GoRoute(
                            path: 'new',
                            name: 'importNew',
                            builder: (context, state) => ImportWizardPage(
                              customerId:
                                  state.pathParameters['customerId']!,
                            ),
                          ),
                        ],
                      ),
                      GoRoute(
                        path: 'reports',
                        name: 'reports',
                        builder: (context, state) => ReportsListPage(
                          customerId: state.pathParameters['customerId']!,
                        ),
                      ),
                      GoRoute(
                        path: 'campaigns',
                        name: 'campaigns',
                        builder: (context, state) => AdminCampaignListPage(
                          customerId: state.pathParameters['customerId']!,
                        ),
                        routes: [
                          GoRoute(
                            path: 'new',
                            name: 'campaignNew',
                            builder: (context, state) => CampaignWizardPage(
                              customerId:
                                  state.pathParameters['customerId']!,
                            ),
                          ),
                          GoRoute(
                            path: ':campaignId',
                            name: 'campaign',
                            builder: (context, state) => CampaignWorkspacePage(
                              customerId:
                                  state.pathParameters['customerId']!,
                              campaignId:
                                  state.pathParameters['campaignId']!,
                            ),
                            routes: [
                              GoRoute(
                                path: 'participants',
                                name: 'participants',
                                builder: (context, state) =>
                                    ParticipantsPage(
                                  campaignId:
                                      state.pathParameters['campaignId']!,
                                ),
                              ),
                              GoRoute(
                                path: 'submissions',
                                name: 'submissions',
                                builder: (context, state) =>
                                    SubmissionsPage(
                                  campaignId:
                                      state.pathParameters['campaignId']!,
                                ),
                              ),
                              GoRoute(
                                path: 'impact-factors',
                                name: 'impactFactors',
                                builder: (context, state) =>
                                    ImpactFactorsPage(
                                  customerId:
                                      state.pathParameters['customerId']!,
                                  campaignId:
                                      state.pathParameters['campaignId']!,
                                ),
                              ),
                              GoRoute(
                                path: 'dashboard',
                                name: 'campaignDashboard',
                                builder: (context, state) =>
                                    AggregateDashboardPage(
                                  scope: 'campaign',
                                  campaignId:
                                      state.pathParameters['campaignId'],
                                ),
                              ),
                              GoRoute(
                                path: 'report',
                                name: 'campaignReport',
                                builder: (context, state) =>
                                    CampaignReportPage(
                                  campaignId:
                                      state.pathParameters['campaignId'],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  );
}
