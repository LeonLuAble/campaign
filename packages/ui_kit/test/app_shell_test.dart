import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_kit/ui_kit.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const destinations = [
    AppShellDestination(
      id: 'overview',
      label: 'Overview',
      icon: Icons.dashboard_outlined,
    ),
    AppShellDestination(
      id: 'campaigns',
      label: 'Campaigns',
      icon: Icons.flag_outlined,
    ),
  ];

  Widget wrap(Size size, Widget child) {
    return MaterialApp(
      theme: AppTheme.light(),
      home: MediaQuery(
        data: MediaQueryData(size: size),
        child: child,
      ),
    );
  }

  testWidgets('PermissionGate hides without permission', (tester) async {
    await tester.pumpWidget(
      wrap(
        const Size(400, 400),
        PermissionGate(
          permissionKeys: const {'campaigns.read'},
          anyOf: const ['memberships.read'],
          child: const Text('secret'),
        ),
      ),
    );
    expect(find.text('secret'), findsNothing);

    await tester.pumpWidget(
      wrap(
        const Size(400, 400),
        PermissionGate(
          permissionKeys: const {'memberships.read'},
          anyOf: const ['memberships.read'],
          child: const Text('secret'),
        ),
      ),
    );
    expect(find.text('secret'), findsOneWidget);
  });

  testWidgets('AppShell uses drawer, rail, and extended rail by width', (
    tester,
  ) async {
    Future<void> pumpAt(double width) async {
      final size = Size(width, 900);
      await tester.binding.setSurfaceSize(size);
      await tester.pumpWidget(
        wrap(
          size,
          AppShell(
            destinations: destinations,
            selectedIndex: 0,
            onDestinationSelected: (_) {},
            title: const Text('Title'),
            body: const ColoredBox(
              color: Colors.white,
              child: Center(child: Text('Body')),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    await pumpAt(500);
    expect(find.byIcon(Icons.menu), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);
    expect(tester.takeException(), isNull);

    await pumpAt(700);
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(
      tester.widget<NavigationRail>(find.byType(NavigationRail)).extended,
      isFalse,
    );
    expect(tester.takeException(), isNull);

    await pumpAt(1000);
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(
      tester.widget<NavigationRail>(find.byType(NavigationRail)).extended,
      isTrue,
    );
    expect(tester.takeException(), isNull);

    await pumpAt(1300);
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(
      tester.widget<NavigationRail>(find.byType(NavigationRail)).extended,
      isTrue,
    );
    expect(tester.takeException(), isNull);
  });
}
