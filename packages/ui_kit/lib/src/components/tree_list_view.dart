import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_tokens.dart';

/// A node in [TreeListView].
class TreeListNode<T> {
  const TreeListNode({
    required this.id,
    required this.data,
    this.children = const [],
  });

  final String id;
  final T data;
  final List<TreeListNode<T>> children;

  bool get hasChildren => children.isNotEmpty;
}

/// Row overflow-menu action for [TreeListView].
class TreeListAction {
  const TreeListAction({
    required this.id,
    required this.label,
    required this.onSelected,
    this.icon,
  });

  final String id;
  final String label;
  final VoidCallback onSelected;
  final IconData? icon;
}

/// Expandable / collapsible hierarchy of any depth.
///
/// Labels and action strings are constructor parameters — do not embed l10n.
class TreeListView<T> extends StatefulWidget {
  const TreeListView({
    required this.nodes,
    required this.labelBuilder,
    this.semanticsLabelBuilder,
    this.actionsBuilder,
    this.initiallyExpandedIds,
    this.indentPerLevel,
    this.expandTooltip = 'Expand',
    this.collapseTooltip = 'Collapse',
    this.actionsTooltip = 'Actions',
    this.shrinkWrap = false,
    this.physics,
    super.key,
  });

  final List<TreeListNode<T>> nodes;
  final String Function(TreeListNode<T> node) labelBuilder;
  final String Function(TreeListNode<T> node)? semanticsLabelBuilder;
  final List<TreeListAction> Function(TreeListNode<T> node)? actionsBuilder;
  final Set<String>? initiallyExpandedIds;
  final double? indentPerLevel;
  final String expandTooltip;
  final String collapseTooltip;
  final String actionsTooltip;
  final bool shrinkWrap;
  final ScrollPhysics? physics;

  @override
  State<TreeListView<T>> createState() => _TreeListViewState<T>();
}

class _TreeListViewState<T> extends State<TreeListView<T>> {
  late Set<String> _expanded;
  final Map<String, FocusNode> _focusNodes = {};

  @override
  void initState() {
    super.initState();
    _expanded = {...?widget.initiallyExpandedIds};
    if (_expanded.isEmpty) {
      void expandAll(List<TreeListNode<T>> nodes) {
        for (final node in nodes) {
          if (node.hasChildren) {
            _expanded.add(node.id);
            expandAll(node.children);
          }
        }
      }

      expandAll(widget.nodes);
    }
  }

  @override
  void didUpdateWidget(covariant TreeListView<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.nodes, widget.nodes)) {
      final ids = <String>{};
      void walk(List<TreeListNode<T>> nodes) {
        for (final node in nodes) {
          ids.add(node.id);
          walk(node.children);
        }
      }

      walk(widget.nodes);
      _expanded.removeWhere((id) => !ids.contains(id));
      _focusNodes.removeWhere((id, node) {
        if (!ids.contains(id)) {
          node.dispose();
          return true;
        }
        return false;
      });
    }
  }

  @override
  void dispose() {
    for (final node in _focusNodes.values) {
      node.dispose();
    }
    super.dispose();
  }

  FocusNode _focusFor(String id) => _focusNodes.putIfAbsent(
        id,
        () => FocusNode(debugLabel: 'tree-$id'),
      );

  void _toggle(String id) {
    setState(() {
      if (_expanded.contains(id)) {
        _expanded.remove(id);
      } else {
        _expanded.add(id);
      }
    });
  }

  List<_FlatRow<T>> _flatten() {
    final rows = <_FlatRow<T>>[];
    void walk(List<TreeListNode<T>> nodes, int depth) {
      for (final node in nodes) {
        final expanded = _expanded.contains(node.id);
        rows.add(_FlatRow(node: node, depth: depth, expanded: expanded));
        if (node.hasChildren && expanded) {
          walk(node.children, depth + 1);
        }
      }
    }

    walk(widget.nodes, 0);
    return rows;
  }

  KeyEventResult _onKey(_FlatRow<T> row, KeyEvent event) {
    if (event is! KeyDownEvent) {
      return KeyEventResult.ignored;
    }
    final key = event.logicalKey;
    if (key == LogicalKeyboardKey.arrowRight &&
        row.node.hasChildren &&
        !row.expanded) {
      _toggle(row.node.id);
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.arrowLeft &&
        row.node.hasChildren &&
        row.expanded) {
      _toggle(row.node.id);
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.enter ||
        key == LogicalKeyboardKey.space) {
      if (row.node.hasChildren) {
        _toggle(row.node.id);
        return KeyEventResult.handled;
      }
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final tokens = AppTokens.of(context);
    final indent = widget.indentPerLevel ?? tokens.spaceLg;
    final rows = _flatten();

    return ListView.builder(
      shrinkWrap: widget.shrinkWrap,
      physics: widget.physics,
      itemCount: rows.length,
      itemBuilder: (context, index) {
        final row = rows[index];
        final label = widget.labelBuilder(row.node);
        final semantics = widget.semanticsLabelBuilder?.call(row.node) ?? label;
        final actions = widget.actionsBuilder?.call(row.node) ?? const [];
        final focusNode = _focusFor(row.node.id);

        return Focus(
          focusNode: focusNode,
          onKeyEvent: (node, event) => _onKey(row, event),
          child: Semantics(
            label: semantics,
            expanded: row.node.hasChildren ? row.expanded : null,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => focusNode.requestFocus(),
                focusColor:
                    Theme.of(context).colorScheme.surfaceContainerHighest,
                child: Padding(
                  padding: EdgeInsets.only(
                    left: tokens.spaceSm + row.depth * indent,
                    right: tokens.spaceSm,
                    top: tokens.spaceXs,
                    bottom: tokens.spaceXs,
                  ),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 40,
                        child: row.node.hasChildren
                            ? IconButton(
                                tooltip: row.expanded
                                    ? widget.collapseTooltip
                                    : widget.expandTooltip,
                                onPressed: () => _toggle(row.node.id),
                                icon: Icon(
                                  row.expanded
                                      ? Icons.expand_more
                                      : Icons.chevron_right,
                                ),
                              )
                            : const SizedBox.shrink(),
                      ),
                      Expanded(
                        child: Text(
                          label,
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      ),
                      if (actions.isNotEmpty)
                        PopupMenuButton<String>(
                          tooltip: widget.actionsTooltip,
                          onSelected: (id) {
                            for (final action in actions) {
                              if (action.id == id) {
                                action.onSelected();
                                break;
                              }
                            }
                          },
                          itemBuilder: (context) => [
                            for (final action in actions)
                              PopupMenuItem(
                                value: action.id,
                                child: Row(
                                  children: [
                                    if (action.icon != null) ...[
                                      Icon(action.icon, size: 18),
                                      const SizedBox(width: 8),
                                    ],
                                    Text(action.label),
                                  ],
                                ),
                              ),
                          ],
                          icon: const Icon(Icons.more_vert),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _FlatRow<T> {
  const _FlatRow({
    required this.node,
    required this.depth,
    required this.expanded,
  });

  final TreeListNode<T> node;
  final int depth;
  final bool expanded;
}
