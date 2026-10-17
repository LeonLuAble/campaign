import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_kit/ui_kit.dart';

import 'support/harness.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('AppDataTable shows empty, loading, error, and row actions', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(800, 600));

    await tester.pumpWidget(
      harness(
        locale: const Locale('en'),
        textScale: 1,
        child: const SizedBox(
          height: 400,
          child: AppDataTable<String>(
            columns: [AppDataColumn(id: 'name', label: 'Name')],
            rows: [],
            cellsBuilder: _emptyCells,
            emptyMessage: 'Nothing here',
            loading: true,
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.byType(LoadingSkeleton), findsOneWidget);

    var retried = false;
    await tester.pumpWidget(
      harness(
        locale: const Locale('en'),
        textScale: 1,
        child: SizedBox(
          height: 400,
          child: AppDataTable<String>(
            columns: const [AppDataColumn(id: 'name', label: 'Name')],
            rows: const [],
            cellsBuilder: _emptyCells,
            emptyMessage: 'Nothing here',
            errorMessage: 'Boom',
            retryLabel: 'Retry',
            onRetry: () => retried = true,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Boom'), findsOneWidget);
    await tester.tap(find.text('Retry'));
    expect(retried, isTrue);

    await tester.pumpWidget(
      harness(
        locale: const Locale('en'),
        textScale: 1,
        child: const SizedBox(
          height: 400,
          child: AppDataTable<String>(
            columns: [AppDataColumn(id: 'name', label: 'Name')],
            rows: [],
            cellsBuilder: _emptyCells,
            emptyMessage: 'Nothing here',
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Nothing here'), findsOneWidget);

    var acted = false;
    await tester.pumpWidget(
      harness(
        locale: const Locale('en'),
        textScale: 1,
        child: SizedBox(
          height: 400,
          child: AppDataTable<String>(
            columns: const [AppDataColumn(id: 'name', label: 'Name')],
            rows: const ['Ada'],
            cellsBuilder: (context, row) => [Text(row)],
            emptyMessage: 'Nothing here',
            actionsLabel: 'Actions',
            hasMore: true,
            loadMoreLabel: 'Load more',
            onLoadMore: () {},
            rowActionsBuilder: (context, row) => [
              AppDataRowAction(
                id: 'open',
                label: 'Open',
                onSelected: () => acted = true,
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Ada'), findsOneWidget);
    expect(find.text('Name'), findsOneWidget);
    expect(find.text('Load more'), findsOneWidget);
    await tester.tap(find.byTooltip('Actions'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Open'));
    expect(acted, isTrue);
  });
}

List<Widget> _emptyCells(BuildContext context, String row) => const [];
