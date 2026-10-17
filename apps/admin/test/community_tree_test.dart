import 'package:api_client/api_client.dart';
import 'package:community_campaign_admin/app.dart';
import 'package:community_campaign_admin/communities/community_tree.dart';
import 'package:community_campaign_admin/config/app_config.dart';
import 'package:community_campaign_admin/locale/app_locales.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_kit/ui_kit.dart';

void main() {
  const config = AppConfig(
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000/api/v1',
  );

  const fourLevel = [
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
    Community(
      id: 'c4',
      customerId: 'cust-1',
      parentId: 'c3',
      name: 'Cheras',
      slug: 'cheras',
      isActive: true,
    ),
  ];

  FakeCampaignApiClient adminApi({
    CustomerAccess? access,
    List<Community>? communities,
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
      communities: communities ?? fourLevel,
      customerAccess: access ?? FakeCampaignApiClient.defaultTenantAccess,
    );
  }

  Future<void> signIn(WidgetTester tester) async {
    await tester.enterText(find.byType(TextField).at(0), 'admin@example.com');
    await tester.enterText(find.byType(TextField).at(1), 'password123');
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await tester.pumpAndSettle();
  }

  Future<void> openCommunities(WidgetTester tester) async {
    await tester.tap(find.byType(DropdownButton<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tzu Chi Malaysia').last);
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationRail),
        matching: find.byIcon(Icons.account_tree_outlined),
      ),
    );
    await tester.pumpAndSettle();
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

  test('buildCommunityTree nests a flat 4-level list', () {
    final tree = buildCommunityTree(fourLevel);
    expect(tree, hasLength(1));
    expect(tree.single.data.name, 'Malaysia');
    expect(tree.single.children.single.data.name, 'Central');
    expect(tree.single.children.single.children.single.data.name, 'KL');
    expect(
      tree.single.children.single.children.single.children.single.data.name,
      'Cheras',
    );
  });

  test('communitySubtreeIds excludes ancestors and siblings', () {
    final ids = communitySubtreeIds(fourLevel, 'c2');
    expect(ids, {'c2', 'c3', 'c4'});
  });

  testWidgets('expands and collapses nested communities', (tester) async {
    final api = adminApi();
    await pumpApp(tester, api: api);
    await signIn(tester);
    await openCommunities(tester);

    expect(find.byType(TreeListView<Community>), findsOneWidget);
    expect(find.text('Malaysia'), findsOneWidget);
    expect(find.text('Cheras'), findsOneWidget);

    await tester.tap(find.byTooltip('Collapse').first);
    await tester.pumpAndSettle();
    expect(find.text('Cheras'), findsNothing);

    await tester.tap(find.byTooltip('Expand').first);
    await tester.pumpAndSettle();
    expect(find.text('Central'), findsOneWidget);
  });

  testWidgets('adds a child community', (tester) async {
    final api = adminApi();
    await pumpApp(tester, api: api);
    await signIn(tester);
    await openCommunities(tester);

    await tester.tap(find.byTooltip('Community actions').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Add child'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextField, 'Community name'),
      'Sub Branch',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Create'));
    await tester.pumpAndSettle();

    expect(find.text('Sub Branch'), findsOneWidget);
    expect(api.communities.any((row) => row.name == 'Sub Branch'), isTrue);
  });

  testWidgets('renames a community', (tester) async {
    final api = adminApi();
    await pumpApp(tester, api: api);
    await signIn(tester);
    await openCommunities(tester);

    await tester.tap(find.byTooltip('Community actions').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Rename'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextField, 'Community name'),
      'Malaysia HQ',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Save'));
    await tester.pumpAndSettle();

    expect(find.text('Malaysia HQ'), findsOneWidget);
  });

  testWidgets('moves a community under another parent', (tester) async {
    final api = adminApi(
      communities: const [
        Community(
          id: 'c1',
          customerId: 'cust-1',
          name: 'Root A',
          slug: 'root-a',
          isActive: true,
        ),
        Community(
          id: 'c2',
          customerId: 'cust-1',
          name: 'Root B',
          slug: 'root-b',
          isActive: true,
        ),
        Community(
          id: 'c3',
          customerId: 'cust-1',
          parentId: 'c1',
          name: 'Child',
          slug: 'child',
          isActive: true,
        ),
      ],
    );
    await pumpApp(tester, api: api);
    await signIn(tester);
    await openCommunities(tester);

    // Visible order with expand-all: Root A, Child, Root B.
    final menus = find.byTooltip('Community actions');
    await tester.tap(menus.at(1));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Move to…'));
    await tester.pumpAndSettle();

    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('Root B'),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(FilledButton, 'Move'),
      ),
    );
    await tester.pumpAndSettle();

    final child = api.communities.firstWhere((row) => row.id == 'c3');
    expect(child.parentId, 'c2');
  });

  testWidgets('cycle error shows localized message', (tester) async {
    final api = adminApi(
      communities: const [
        Community(
          id: 'c1',
          customerId: 'cust-1',
          name: 'Root A',
          slug: 'root-a',
          isActive: true,
        ),
        Community(
          id: 'c2',
          customerId: 'cust-1',
          name: 'Root B',
          slug: 'root-b',
          isActive: true,
        ),
      ],
    );
    api.forceCycleOnNextCommunityUpdate = true;
    await pumpApp(tester, api: api);
    await signIn(tester);
    await openCommunities(tester);

    await tester.tap(find.byTooltip('Community actions').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Move to…'));
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('Root B'),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(FilledButton, 'Move'),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.text('That move would create a cycle. Choose a different parent.'),
      findsWidgets,
    );
  });

  testWidgets('read-only users see the tree without actions', (tester) async {
    final api = adminApi(
      access: const CustomerAccess(
        roles: [],
        permissionKeys: [
          'communities.read',
          'customers.read',
          'campaigns.read',
        ],
        isTenantLevel: true,
        communityIds: [],
      ),
    );
    await pumpApp(tester, api: api);
    await signIn(tester);
    await openCommunities(tester);

    expect(find.text('Malaysia'), findsOneWidget);
    expect(find.text('Cheras'), findsOneWidget);
    expect(find.byTooltip('Community actions'), findsNothing);
    expect(
      find.widgetWithText(FilledButton, 'Create community'),
      findsNothing,
    );
  });
}
