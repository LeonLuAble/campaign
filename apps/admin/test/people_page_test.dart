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

  const memberRole = Role(
    id: 'role-member',
    customerId: 'cust-1',
    key: 'member',
    name: 'Member',
    isSystem: true,
    permissionKeys: ['campaigns.read'],
  );
  const adminRole = Role(
    id: 'role-ta',
    customerId: 'cust-1',
    key: 'tenant_admin',
    name: 'Tenant Admin',
    isSystem: true,
    permissionKeys: [
      'memberships.create',
      'memberships.read',
      'memberships.update',
      'roles.assign',
      'roles.read',
    ],
  );

  List<Membership> seedMembers() => [
        Membership(
          id: 'mem-1',
          customerId: 'cust-1',
          userId: 'user-pending',
          communityId: 'c2',
          isActive: true,
          roles: const [
            RoleSummary(id: 'role-member', key: 'member', name: 'Member'),
          ],
          user: const MembershipUserSummary(
            id: 'user-pending',
            displayName: 'Pending Mei',
            email: 'mei@example.com',
            activationStatus: 'pending',
          ),
          community: const MembershipCommunitySummary(
            id: 'c2',
            name: 'Central',
          ),
        ),
        Membership(
          id: 'mem-2',
          customerId: 'cust-1',
          userId: 'user-active',
          communityId: 'c2',
          isActive: true,
          roles: const [
            RoleSummary(id: 'role-member', key: 'member', name: 'Member'),
          ],
          user: const MembershipUserSummary(
            id: 'user-active',
            displayName: 'Active Wei',
            email: 'wei@example.com',
            activationStatus: 'active',
          ),
          community: const MembershipCommunitySummary(
            id: 'c2',
            name: 'Central',
          ),
        ),
        Membership(
          id: 'mem-3',
          customerId: 'cust-1',
          userId: 'user-mobile',
          communityId: 'c3',
          isActive: true,
          roles: const [
            RoleSummary(id: 'role-member', key: 'member', name: 'Member'),
          ],
          user: const MembershipUserSummary(
            id: 'user-mobile',
            displayName: 'Mobile Only',
            mobile: '+60123456789',
            activationStatus: 'pending',
          ),
          community: const MembershipCommunitySummary(
            id: 'c3',
            name: 'KL',
          ),
        ),
        Membership(
          id: 'mem-admin',
          customerId: 'cust-1',
          userId: 'user-admin',
          isActive: true,
          roles: const [
            RoleSummary(id: 'role-ta', key: 'tenant_admin', name: 'Tenant Admin'),
          ],
          user: const MembershipUserSummary(
            id: 'user-admin',
            displayName: 'Sole Admin',
            email: 'admin.tenant@example.com',
            activationStatus: 'active',
          ),
        ),
        for (var i = 0; i < 25; i++)
          Membership(
            id: 'mem-extra-$i',
            customerId: 'cust-1',
            userId: 'user-extra-$i',
            communityId: 'c1',
            isActive: true,
            roles: const [
              RoleSummary(id: 'role-member', key: 'member', name: 'Member'),
            ],
            user: MembershipUserSummary(
              id: 'user-extra-$i',
              displayName: 'Extra $i',
              email: 'extra$i@example.com',
              activationStatus: 'active',
            ),
            community: const MembershipCommunitySummary(
              id: 'c1',
              name: 'Malaysia',
            ),
          ),
      ];

  FakeCampaignApiClient adminApi({
    CustomerAccess? access,
    bool lastTenantAdminGuard = false,
  }) {
    return FakeCampaignApiClient(
      profile: const UserProfile(
        id: 'admin-1',
        displayName: 'Admin',
        locale: 'en',
        isActive: true,
        isPlatformAdmin: true,
        identities: [
          UserIdentity(
            id: 'id-1',
            type: 'email',
            identifier: 'admin@example.com',
            isVerified: true,
          ),
        ],
      ),
      communities: const [
        Community(
          id: 'c1',
          customerId: 'cust-1',
          name: 'Malaysia',
          slug: 'malaysia',
          isActive: true,
        ),
        Community(
          id: 'c2',
          customerId: 'cust-1',
          parentId: 'c1',
          name: 'Central',
          slug: 'central',
          isActive: true,
        ),
        Community(
          id: 'c3',
          customerId: 'cust-1',
          parentId: 'c2',
          name: 'KL',
          slug: 'kl',
          isActive: true,
        ),
      ],
      memberships: seedMembers(),
      roles: const [memberRole, adminRole],
      customerAccess: access ?? FakeCampaignApiClient.defaultTenantAccess,
      lastTenantAdminGuard: lastTenantAdminGuard,
    );
  }

  Future<void> pumpApp(
    WidgetTester tester, {
    required FakeCampaignApiClient api,
  }) async {
    final view = tester.view;
    view.physicalSize = const Size(1400, 1000);
    view.devicePixelRatio = 1.0;
    addTearDown(view.resetPhysicalSize);
    addTearDown(view.resetDevicePixelRatio);
    await tester.pumpWidget(
      CampaignAdminApp(
        config: config,
        locale: AppLocales.en,
        apiClient: api,
        tokenStore: MemoryTokenStore(),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> signIn(WidgetTester tester) async {
    await tester.enterText(find.byType(TextField).at(0), 'admin@example.com');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
  }

  Future<void> openPeople(WidgetTester tester) async {
    await tester.tap(find.byType(DropdownButton<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tzu Chi Malaysia').last);
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationRail),
        matching: find.byIcon(Icons.people_outline),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('lists members with filters and pagination', (tester) async {
    final api = adminApi();
    await pumpApp(tester, api: api);
    await signIn(tester);
    await openPeople(tester);

    expect(find.text('Pending Mei'), findsOneWidget);
    expect(find.text('mei@example.com'), findsWidgets);

    await tester.tap(find.text('Pending only'));
    await tester.pumpAndSettle();
    expect(find.text('Pending Mei'), findsOneWidget);
    expect(find.text('Active Wei'), findsNothing);

    await tester.tap(find.text('Pending only'));
    await tester.pumpAndSettle();
    expect(find.text('Load more'), findsOneWidget);
    await tester.tap(find.text('Load more'));
    await tester.pumpAndSettle();
    expect(find.text('Extra 20'), findsOneWidget);
  });

  testWidgets('invites by email and mobile-only', (tester) async {
    final api = adminApi();
    await pumpApp(tester, api: api);
    await signIn(tester);
    await openPeople(tester);

    await tester.tap(find.widgetWithText(FilledButton, 'Invite member'));
    await tester.pumpAndSettle();
    final dialogFields = find.descendant(
      of: find.byType(AlertDialog),
      matching: find.byType(TextField),
    );
    await tester.enterText(dialogFields.at(0), 'new@example.com');
    await tester.enterText(dialogFields.at(2), 'New Member');
    await tester.tap(find.widgetWithText(FilledButton, 'Send invite'));
    await tester.pumpAndSettle();
    expect(find.text('Invitation sent'), findsOneWidget);
    expect(find.textContaining('new@example.com'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Close'));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(FilledButton, 'Invite member'));
    await tester.pumpAndSettle();
    final mobileFields = find.descendant(
      of: find.byType(AlertDialog),
      matching: find.byType(TextField),
    );
    await tester.enterText(mobileFields.at(1), '0123456789');
    await tester.tap(find.widgetWithText(FilledButton, 'Send invite'));
    await tester.pumpAndSettle();
    expect(find.text('One-time activation link'), findsOneWidget);
    expect(find.textContaining('/activate?token='), findsOneWidget);
    expect(find.text('Copy'), findsOneWidget);
  });

  testWidgets('assigns and removes roles; shows last-admin guard', (
    tester,
  ) async {
    final api = adminApi(lastTenantAdminGuard: true);
    await pumpApp(tester, api: api);
    await signIn(tester);
    await openPeople(tester);

    await tester.tap(find.text('Active Wei'));
    await tester.pumpAndSettle();
    expect(find.text('Roles'), findsWidgets);
    await tester.tap(find.text('Add role'));
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(SimpleDialog),
        matching: find.text('Tenant Admin'),
      ),
    );
    await tester.pumpAndSettle();
    expect(
      find.descendant(
        of: find.byType(InputChip),
        matching: find.text('Tenant Admin'),
      ),
      findsOneWidget,
    );

    await tester.tap(find.byTooltip('Close'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Sole Admin'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Deactivate'));
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(FilledButton, 'Deactivate'),
      ),
    );
    await tester.pumpAndSettle();
    expect(
      find.text(
        'You cannot remove or deactivate the last organisation admin.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('resends activation for pending members', (tester) async {
    final api = adminApi();
    await pumpApp(tester, api: api);
    await signIn(tester);
    await openPeople(tester);

    await tester.tap(find.text('Pending Mei'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Resend activation'));
    await tester.pumpAndSettle();
    expect(find.text('Activation email sent again.'), findsOneWidget);
  });

  testWidgets('hides invite without memberships.create', (tester) async {
    final api = adminApi(
      access: const CustomerAccess(
        roles: [
          RoleSummary(id: 'role-reader', key: 'reader', name: 'Reader'),
        ],
        permissionKeys: ['memberships.read', 'communities.read', 'roles.read'],
        isTenantLevel: true,
        communityIds: [],
      ),
    );
    await pumpApp(tester, api: api);
    await signIn(tester);
    await openPeople(tester);

    expect(find.text('Invite member'), findsNothing);
    expect(find.text('Roles'), findsWidgets);
  });

  testWidgets('community-scoped caller omits contact details', (tester) async {
    final api = adminApi(
      access: const CustomerAccess(
        roles: [
          RoleSummary(id: 'role-leader', key: 'leader', name: 'Leader'),
        ],
        permissionKeys: [
          'memberships.read',
          'memberships.create',
          'communities.read',
          'roles.read',
        ],
        isTenantLevel: false,
        communityIds: ['c2'],
      ),
    );
    await pumpApp(tester, api: api);
    await signIn(tester);
    await openPeople(tester);

    expect(find.text('Pending Mei'), findsOneWidget);
    expect(find.text('mei@example.com'), findsNothing);
    expect(find.text('Email / mobile'), findsNothing);
  });

  testWidgets('roles page lists permission keys read-only', (tester) async {
    final api = adminApi();
    await pumpApp(tester, api: api);
    await signIn(tester);
    await openPeople(tester);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Roles'));
    await tester.pumpAndSettle();
    expect(find.text('Member'), findsOneWidget);
    await tester.tap(find.text('Member'));
    await tester.pumpAndSettle();
    expect(find.text('campaigns.read'), findsOneWidget);
    expect(find.text('Create'), findsNothing);

    final context = tester.element(find.byType(Scaffold).first);
    expect(
      GoRouter.of(context).state.uri.path,
      '/customers/cust-1/people/roles',
    );
  });
}
