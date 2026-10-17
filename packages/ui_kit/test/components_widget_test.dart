import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_kit/ui_kit.dart';

import 'support/harness.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  for (final c in localeScaleCases) {
    group('components ${c.name}', () {
      testWidgets('StatusChip shows label and semantics', (tester) async {
        await tester.binding.setSurfaceSize(const Size(420, 240));
        final label = isZh(c.locale) ? '已开始' : 'Started';
        await tester.pumpWidget(
          harness(
            locale: c.locale,
            textScale: c.scale,
            child: StatusChip(label: label, icon: Icons.play_arrow),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text(label), findsOneWidget);
        expect(find.byIcon(Icons.play_arrow), findsOneWidget);
        expect(tester.getSemantics(find.byType(StatusChip)), isNotNull);
        expect(
          tester.getSemantics(find.byType(StatusChip)).label,
          label,
        );
      });

      testWidgets('EmptyState shows message', (tester) async {
        await tester.binding.setSurfaceSize(const Size(420, 360));
        final message = isZh(c.locale) ? '暂无数据' : 'Nothing here yet';
        await tester.pumpWidget(
          harness(
            locale: c.locale,
            textScale: c.scale,
            child: EmptyState(message: message),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text(message), findsOneWidget);
      });

      testWidgets('ErrorState shows message, correlation id, and retry', (
        tester,
      ) async {
        await tester.binding.setSurfaceSize(const Size(420, 420));
        final message = isZh(c.locale) ? '加载失败' : 'Failed to load';
        final retry = isZh(c.locale) ? '重试' : 'Retry';
        var retried = false;
        await tester.pumpWidget(
          harness(
            locale: c.locale,
            textScale: c.scale,
            child: ErrorState(
              message: message,
              retryLabel: retry,
              correlationId: 'req-123',
              onRetry: () => retried = true,
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text(message), findsOneWidget);
        expect(find.text('req-123'), findsOneWidget);
        expect(find.text(retry), findsOneWidget);
        await tester.tap(find.text(retry));
        expect(retried, isTrue);
      });

      testWidgets('LoadingSkeleton lays out without overflow', (tester) async {
        await tester.binding.setSurfaceSize(const Size(420, 240));
        await tester.pumpWidget(
          harness(
            locale: c.locale,
            textScale: c.scale,
            child: const LoadingSkeleton(lines: 4),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.byType(LoadingSkeleton), findsOneWidget);
      });

      testWidgets('PageScaffold shows title and actions', (tester) async {
        await tester.binding.setSurfaceSize(const Size(480, 640));
        final title = isZh(c.locale) ? '客户' : 'Customers';
        final action = isZh(c.locale) ? '新建' : 'New';
        await tester.pumpWidget(
          MaterialApp(
            locale: c.locale,
            theme: AppTheme.light(),
            home: MediaQuery(
              data: MediaQueryData(textScaler: TextScaler.linear(c.scale)),
              child: PageScaffold(
                title: title,
                primaryAction: FilledButton(
                  onPressed: () {},
                  child: Text(action),
                ),
                body: Text(isZh(c.locale) ? '正文' : 'Body'),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text(title), findsOneWidget);
        expect(find.text(action), findsOneWidget);
        expect(find.text(isZh(c.locale) ? '正文' : 'Body'), findsOneWidget);
      });

      testWidgets('ProgressRing shows label and semantics', (tester) async {
        await tester.binding.setSurfaceSize(const Size(420, 320));
        const label = '120%';
        const semantics = 'Campaign progress 120 percent';
        await tester.pumpWidget(
          harness(
            locale: c.locale,
            textScale: c.scale,
            child: const ProgressRing(
              completion: 1.2,
              label: label,
              semanticsLabel: semantics,
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text(label), findsOneWidget);
        final node = tester.getSemantics(find.byType(ProgressRing));
        expect(node.label, contains(semantics));
        expect(node.value, contains('120%'));
      });

      testWidgets('MetricTile shows label value caption and icon', (
        tester,
      ) async {
        await tester.binding.setSurfaceSize(const Size(420, 320));
        final title = isZh(c.locale) ? '成员' : 'Members';
        final caption = isZh(c.locale) ? '活跃' : 'Active';
        await tester.pumpWidget(
          harness(
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
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text(title), findsOneWidget);
        expect(find.text('128'), findsOneWidget);
        expect(find.text(caption), findsOneWidget);
        expect(find.byIcon(Icons.groups_outlined), findsOneWidget);
      });

      testWidgets('TreeVisualization shows text and semantics', (tester) async {
        await tester.binding.setSurfaceSize(const Size(420, 320));
        final completion =
            isZh(c.locale) ? '完成：64%' : 'Completion: 64%';
        await tester.pumpWidget(
          harness(
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
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text('素心树'), findsOneWidget);
        expect(find.text(completion), findsOneWidget);
        final node = tester.getSemantics(find.byType(TreeVisualization));
        expect(node.label, contains('素心树'));
        expect(node.label, contains('64%'));
      });

      testWidgets('icon button exposes semantics label', (tester) async {
        await tester.binding.setSurfaceSize(const Size(420, 240));
        final tip = isZh(c.locale) ? '刷新' : 'Refresh';
        await tester.pumpWidget(
          harness(
            locale: c.locale,
            textScale: c.scale,
            child: IconButton(
              onPressed: () {},
              icon: const Icon(Icons.refresh),
              tooltip: tip,
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.byIcon(Icons.refresh), findsOneWidget);
        final data =
            tester.getSemantics(find.byType(IconButton)).getSemanticsData();
        expect(
          data.label == tip || data.tooltip == tip,
          isTrue,
          reason: 'expected tooltip/label "$tip", got label="${data.label}" '
              'tooltip="${data.tooltip}"',
        );
      });

      testWidgets('TreeListView expands, collapses, and exposes actions', (
        tester,
      ) async {
        await tester.binding.setSurfaceSize(const Size(640, 480));
        final root = isZh(c.locale) ? '根' : 'Root';
        final child = isZh(c.locale) ? '子' : 'Child';
        final expand = isZh(c.locale) ? '展开' : 'Expand';
        final collapse = isZh(c.locale) ? '折叠' : 'Collapse';
        final actions = isZh(c.locale) ? '操作' : 'Actions';
        final rename = isZh(c.locale) ? '重命名' : 'Rename';
        var renamed = false;
        await tester.pumpWidget(
          harness(
            locale: c.locale,
            textScale: c.scale,
            child: SizedBox(
              height: 400,
              child: TreeListView<String>(
                nodes: [
                  TreeListNode(
                    id: 'root',
                    data: root,
                    children: [
                      TreeListNode(id: 'child', data: child),
                    ],
                  ),
                ],
                labelBuilder: (node) => node.data,
                semanticsLabelBuilder: (node) => node.data,
                expandTooltip: expand,
                collapseTooltip: collapse,
                actionsTooltip: actions,
                actionsBuilder: (node) => [
                  TreeListAction(
                    id: 'rename',
                    label: rename,
                    onSelected: () => renamed = true,
                  ),
                ],
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text(root), findsOneWidget);
        expect(find.text(child), findsOneWidget);
        await tester.tap(find.byTooltip(collapse));
        await tester.pumpAndSettle();
        expect(find.text(child), findsNothing);
        await tester.tap(find.byTooltip(expand));
        await tester.pumpAndSettle();
        expect(find.text(child), findsOneWidget);
        await tester.tap(find.byTooltip(actions).first);
        await tester.pumpAndSettle();
        await tester.tap(find.text(rename).last);
        await tester.pumpAndSettle();
        expect(renamed, isTrue);
      });

      testWidgets('WizardStepper shows steps and footer actions', (tester) async {
        await tester.binding.setSurfaceSize(const Size(640, 480));
        final step1 = isZh(c.locale) ? '组织' : 'Organisation';
        final step2 = isZh(c.locale) ? '管理员' : 'Admin';
        final next = isZh(c.locale) ? '下一步' : 'Next';
        final back = isZh(c.locale) ? '上一步' : 'Back';
        var advanced = false;
        await tester.pumpWidget(
          harness(
            locale: c.locale,
            textScale: c.scale,
            child: SizedBox(
              height: 400,
              child: WizardStepper(
                steps: [step1, step2],
                currentStep: 0,
                nextLabel: next,
                backLabel: back,
                onBack: () {},
                onNext: () => advanced = true,
                body: Text(isZh(c.locale) ? '内容' : 'Body'),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text(step1), findsOneWidget);
        expect(find.text(step2), findsOneWidget);
        expect(find.text(isZh(c.locale) ? '内容' : 'Body'), findsOneWidget);
        await tester.tap(find.text(next));
        expect(advanced, isTrue);
      });
    });
  }
}
