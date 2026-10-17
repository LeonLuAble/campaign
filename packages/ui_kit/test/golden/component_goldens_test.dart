@Tags(['golden'])
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_kit/ui_kit.dart';

Widget _harness({
  required Locale locale,
  required double textScale,
  required Widget child,
}) {
  return MaterialApp(
    locale: locale,
    theme: AppTheme.light(),
    home: MediaQuery(
      data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
      child: Scaffold(
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 360),
            child: Padding(padding: const EdgeInsets.all(16), child: child),
          ),
        ),
      ),
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final cases = <({String name, Locale locale, double scale})>[
    (name: 'en_1x', locale: const Locale('en'), scale: 1),
    (name: 'en_2x', locale: const Locale('en'), scale: 2),
    (
      name: 'zh_1x',
      locale: const Locale.fromSubtags(languageCode: 'zh', scriptCode: 'Hans'),
      scale: 1,
    ),
    (
      name: 'zh_2x',
      locale: const Locale.fromSubtags(languageCode: 'zh', scriptCode: 'Hans'),
      scale: 2,
    ),
  ];

  for (final c in cases) {
    testWidgets('StatusChip golden ${c.name}', (tester) async {
      await tester.binding.setSurfaceSize(const Size(400, 200));
      final label = c.locale.languageCode == 'zh' ? '已开始' : 'Started';
      await tester.pumpWidget(
        _harness(
          locale: c.locale,
          textScale: c.scale,
          child: StatusChip(label: label, icon: Icons.play_arrow),
        ),
      );
      await expectLater(
        find.byType(StatusChip),
        matchesGoldenFile('goldens/status_chip_${c.name}.png'),
      );
    });

    testWidgets('EmptyState golden ${c.name}', (tester) async {
      await tester.binding.setSurfaceSize(const Size(400, 320));
      final message = c.locale.languageCode == 'zh' ? '暂无数据' : 'Nothing here yet';
      await tester.pumpWidget(
        _harness(
          locale: c.locale,
          textScale: c.scale,
          child: EmptyState(message: message),
        ),
      );
      await expectLater(
        find.byType(EmptyState),
        matchesGoldenFile('goldens/empty_state_${c.name}.png'),
      );
    });

    testWidgets('ErrorState golden ${c.name}', (tester) async {
      await tester.binding.setSurfaceSize(const Size(400, 360));
      final message = c.locale.languageCode == 'zh' ? '加载失败' : 'Failed to load';
      final retry = c.locale.languageCode == 'zh' ? '重试' : 'Retry';
      await tester.pumpWidget(
        _harness(
          locale: c.locale,
          textScale: c.scale,
          child: ErrorState(
            message: message,
            retryLabel: retry,
            correlationId: 'req-123',
            onRetry: () {},
          ),
        ),
      );
      await expectLater(
        find.byType(ErrorState),
        matchesGoldenFile('goldens/error_state_${c.name}.png'),
      );
    });

    testWidgets('ProgressRing golden ${c.name}', (tester) async {
      await tester.binding.setSurfaceSize(const Size(400, 280));
      const label = '120%';
      await tester.pumpWidget(
        _harness(
          locale: c.locale,
          textScale: c.scale,
          child: const ProgressRing(completion: 1.2, label: label),
        ),
      );
      await expectLater(
        find.byType(ProgressRing),
        matchesGoldenFile('goldens/progress_ring_${c.name}.png'),
      );
    });

    testWidgets('MetricTile golden ${c.name}', (tester) async {
      await tester.binding.setSurfaceSize(const Size(400, 280));
      final title = c.locale.languageCode == 'zh' ? '成员' : 'Members';
      final caption = c.locale.languageCode == 'zh' ? '活跃' : 'Active';
      await tester.pumpWidget(
        _harness(
          locale: c.locale,
          textScale: c.scale,
          child: MetricTile(
            label: title,
            value: '128',
            caption: caption,
            icon: Icons.groups_outlined,
          ),
        ),
      );
      await expectLater(
        find.byType(MetricTile),
        matchesGoldenFile('goldens/metric_tile_${c.name}.png'),
      );
    });

    testWidgets('TreeVisualization golden ${c.name}', (tester) async {
      await tester.binding.setSurfaceSize(const Size(400, 280));
      final completion =
          c.locale.languageCode == 'zh' ? '完成：64%' : 'Completion: 64%';
      await tester.pumpWidget(
        _harness(
          locale: c.locale,
          textScale: c.scale,
          child: TreeVisualization(
            displayName: '素心树',
            completionLabel: completion,
            completionPercent: 64,
            isActive: true,
            inactiveLabel: 'off',
          ),
        ),
      );
      await expectLater(
        find.byType(TreeVisualization),
        matchesGoldenFile('goldens/tree_visualization_${c.name}.png'),
      );
    });
  }
}
