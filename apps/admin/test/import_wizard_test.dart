import 'package:api_client/api_client.dart';
import 'package:community_campaign_admin/app.dart';
import 'package:community_campaign_admin/config/app_config.dart';
import 'package:community_campaign_admin/imports/download_csv.dart';
import 'package:community_campaign_admin/locale/app_locales.dart';
import 'package:community_campaign_admin/session/api_scope.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const config = AppConfig(
    environment: 'test',
    apiBaseUrl: 'http://localhost:3000/api/v1',
  );

  const goodCsv =
      'external_id,email,mobile,display_name,communityPath\n'
      ',imported@example.com,,Example Member,Region/Branch\n'
      ',matched@example.com,,Matched Member,Region/Branch\n';

  FakeCampaignApiClient adminApi() {
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
      ],
    );
  }

  Future<void> pumpApp(
    WidgetTester tester, {
    required FakeCampaignApiClient api,
    PickCsv? pickCsv,
  }) async {
    final view = tester.view;
    view.physicalSize = const Size(1600, 1400);
    view.devicePixelRatio = 1.0;
    addTearDown(view.resetPhysicalSize);
    addTearDown(view.resetDevicePixelRatio);
    await tester.pumpWidget(
      CampaignAdminApp(
        config: config,
        locale: AppLocales.en,
        apiClient: api,
        tokenStore: MemoryTokenStore(),
        pickCsv: pickCsv,
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

  Future<void> openImports(WidgetTester tester) async {
    await tester.tap(find.byType(DropdownButton<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Tzu Chi Malaysia').last);
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationRail),
        matching: find.byIcon(Icons.upload_file_outlined),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> startNewImport(WidgetTester tester) async {
    await tester.tap(find.widgetWithText(FilledButton, 'New import'));
    await tester.pumpAndSettle();
  }

  Future<void> clearSnackBars(WidgetTester tester) async {
    final messenger = ScaffoldMessenger.maybeOf(
      tester.element(find.byType(Navigator).first),
    );
    messenger?.clearSnackBars();
    await tester.pumpAndSettle();
  }

  Future<void> tapFilled(WidgetTester tester, String label) async {
    await clearSnackBars(tester);
    final finder = find.widgetWithText(FilledButton, label);
    await tester.ensureVisible(finder);
    await tester.tap(finder);
    await tester.pumpAndSettle();
  }

  Future<void> pickAndAdvanceUpload(WidgetTester tester) async {
    await tapFilled(tester, 'Upload CSV');
    await tapFilled(tester, 'Next');
  }

  testWidgets('history lists past imports with counts', (tester) async {
    final api = adminApi();
    api.importHistory = [
      const UserImport(
        id: 'imp-old',
        customerId: 'cust-1',
        originalFilename: 'members-batch.csv',
        status: 'confirmed',
        headers: ['email'],
        counts: UserImportCounts(
          total: 10,
          pending: 0,
          valid: 0,
          invalid: 1,
          review: 0,
          created: 7,
          matched: 2,
        ),
        createdAt: '2026-10-10T00:00:00.000Z',
      ),
    ];
    await pumpApp(tester, api: api);
    await signIn(tester);
    await openImports(tester);

    expect(find.text('members-batch.csv'), findsOneWidget);
    expect(find.text('Confirmed'), findsOneWidget);
    expect(find.text('2026-10-10'), findsOneWidget);
    expect(find.text('Created 7 · matched 2 · errors 1'), findsOneWidget);
  });

  testWidgets('happy path wizard creates import', (tester) async {
    final api = adminApi();
    clearLastDownloadedCsv();
    await pumpApp(
      tester,
      api: api,
      pickCsv: () async => (name: 'members.csv', bytes: goodCsv.codeUnits),
    );
    await signIn(tester);
    await openImports(tester);
    await startNewImport(tester);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Download template'));
    await tester.pumpAndSettle();
    expect(find.text('Template ready.'), findsOneWidget);
    expect(lastDownloadedCsv?.filename, 'user-import-template.csv');
    expect(lastDownloadedCsv?.content, contains('communityPath'));

    await pickAndAdvanceUpload(tester);
    expect(find.text('Map'), findsWidgets);

    await tapFilled(tester, 'Validate');
    expect(find.text('Validation results'), findsOneWidget);
    expect(find.text('2 valid · 0 errors · 0 need review'), findsOneWidget);
    expect(find.text('No error or review rows.'), findsOneWidget);

    await tapFilled(tester, 'Preview');
    expect(find.text('Preview'), findsWidgets);
    expect(find.textContaining('imported@example.com'), findsWidgets);

    await tapFilled(tester, 'Next');
    expect(find.textContaining('2 rows will be imported'), findsOneWidget);

    await tapFilled(tester, 'Confirm import');
    expect(find.text('Import result'), findsOneWidget);
    expect(find.text('Created 2 · matched 0 · errors 0'), findsOneWidget);
    expect(api.importHistory, isNotEmpty);
    expect(api.importHistory.first.status, 'confirmed');
  });

  testWidgets('invalid and review rows are listed with instruction', (
    tester,
  ) async {
    final api = adminApi()..importForceInvalidRows = true;
    await pumpApp(
      tester,
      api: api,
      pickCsv: () async => (name: 'members.csv', bytes: goodCsv.codeUnits),
    );
    await signIn(tester);
    await openImports(tester);
    await startNewImport(tester);
    await pickAndAdvanceUpload(tester);

    await tapFilled(tester, 'Validate');
    expect(find.text('1 valid · 1 errors · 1 need review'), findsOneWidget);
    expect(
      find.textContaining('Fix the CSV and re-import'),
      findsOneWidget,
    );
    expect(find.textContaining('bad@example.com'), findsOneWidget);
    expect(find.textContaining('review@example.com'), findsOneWidget);
    expect(find.textContaining('UNKNOWN_COMMUNITY_PATH'), findsOneWidget);
  });

  testWidgets('bad file type and empty file show clear errors', (tester) async {
    var call = 0;
    final api = adminApi();
    await pumpApp(
      tester,
      api: api,
      pickCsv: () async {
        call += 1;
        if (call == 1) {
          return (name: 'members.txt', bytes: 'email\na@b.com\n'.codeUnits);
        }
        return (name: 'empty.csv', bytes: '   '.codeUnits);
      },
    );
    await signIn(tester);
    await openImports(tester);
    await startNewImport(tester);

    await tester.tap(find.widgetWithText(FilledButton, 'Upload CSV'));
    await tester.pumpAndSettle();
    expect(find.text('Choose a .csv file.'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Upload CSV'));
    await tester.pumpAndSettle();
    expect(find.text('The file is empty.'), findsOneWidget);
  });

  testWidgets('missing required columns message on map step', (tester) async {
    final api = adminApi();
    await pumpApp(
      tester,
      api: api,
      pickCsv: () async => (
        name: 'names-only.csv',
        bytes: 'display_name,communityPath\nAda,Region/Branch\n'.codeUnits,
      ),
    );
    await signIn(tester);
    await openImports(tester);
    await startNewImport(tester);
    await pickAndAdvanceUpload(tester);

    expect(
      find.text('Map at least an email or mobile column.'),
      findsOneWidget,
    );
    expect(find.widgetWithText(FilledButton, 'Validate'), findsOneWidget);
    final validate = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Validate'),
    );
    expect(validate.onPressed, isNull);
  });

  testWidgets('error CSV download after confirm with problem rows', (
    tester,
  ) async {
    final api = adminApi()..importForceInvalidRows = true;
    clearLastDownloadedCsv();
    await pumpApp(
      tester,
      api: api,
      pickCsv: () async => (name: 'members.csv', bytes: goodCsv.codeUnits),
    );
    await signIn(tester);
    await openImports(tester);
    await startNewImport(tester);
    await pickAndAdvanceUpload(tester);

    await tapFilled(tester, 'Validate');
    await tapFilled(tester, 'Preview');
    await tapFilled(tester, 'Next');
    await tapFilled(tester, 'Confirm import');

    expect(find.text('Created 1 · matched 0 · errors 2'), findsOneWidget);
    await clearSnackBars(tester);
    await tester.tap(find.widgetWithText(OutlinedButton, 'Download error CSV'));
    await tester.pumpAndSettle();
    expect(find.text('Error CSV ready.'), findsOneWidget);
    expect(lastDownloadedCsv?.filename, startsWith('import-errors-'));
    expect(lastDownloadedCsv?.content, contains('bad@example.com'));
    expect(lastDownloadedCsv?.content, contains('UNKNOWN_COMMUNITY_PATH'));
    expect(lastDownloadedCsv?.content, contains('review@example.com'));
  });
}
