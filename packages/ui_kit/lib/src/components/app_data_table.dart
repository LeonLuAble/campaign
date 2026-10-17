import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_tokens.dart';
import 'empty_state.dart';
import 'error_state.dart';
import 'loading_skeleton.dart';

/// Column definition for [AppDataTable]. Labels are announced to assistive tech.
class AppDataColumn {
  const AppDataColumn({
    required this.id,
    required this.label,
    this.flex = 1,
    this.numeric = false,
  });

  final String id;
  final String label;
  final int flex;
  final bool numeric;
}

/// Overflow menu action for a table row.
class AppDataRowAction {
  const AppDataRowAction({
    required this.id,
    required this.label,
    this.icon,
    this.onSelected,
    this.isDestructive = false,
  });

  final String id;
  final String label;
  final IconData? icon;
  final VoidCallback? onSelected;
  final bool isDestructive;
}

/// Server-paginated data table with loading, empty, and error states.
///
/// Callers own cursor pagination: pass [hasMore] / [onLoadMore] when the API
/// returns a next cursor. Row action labels and messages are caller-supplied
/// so this kit stays free of app l10n.
class AppDataTable<T> extends StatelessWidget {
  const AppDataTable({
    required this.columns,
    required this.rows,
    required this.cellsBuilder,
    required this.emptyMessage,
    this.rowActionsBuilder,
    this.onRowTap,
    this.loading = false,
    this.errorMessage,
    this.onRetry,
    this.retryLabel = 'Retry',
    this.hasMore = false,
    this.onLoadMore,
    this.loadMoreLabel = 'Load more',
    this.loadingMore = false,
    this.actionsLabel = 'Actions',
    super.key,
  });

  final List<AppDataColumn> columns;
  final List<T> rows;
  final List<Widget> Function(BuildContext context, T row) cellsBuilder;
  final List<AppDataRowAction> Function(BuildContext context, T row)?
      rowActionsBuilder;
  final ValueChanged<T>? onRowTap;
  final bool loading;
  final String? errorMessage;
  final VoidCallback? onRetry;
  final String retryLabel;
  final String emptyMessage;
  final bool hasMore;
  final VoidCallback? onLoadMore;
  final String loadMoreLabel;
  final bool loadingMore;
  final String actionsLabel;

  @override
  Widget build(BuildContext context) {
    final tokens = AppTokens.of(context);
    final theme = Theme.of(context);

    if (loading && rows.isEmpty) {
      return const LoadingSkeleton(lines: 6);
    }
    if (errorMessage != null && rows.isEmpty) {
      return ErrorState(
        message: errorMessage!,
        onRetry: onRetry,
        retryLabel: retryLabel,
      );
    }
    if (!loading && rows.isEmpty) {
      return EmptyState(message: emptyMessage);
    }

    final showActions = rowActionsBuilder != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (errorMessage != null)
          Padding(
            padding: EdgeInsets.only(bottom: tokens.spaceMd),
            child: Material(
              color: theme.colorScheme.errorContainer,
              borderRadius: BorderRadius.circular(tokens.radiusChip),
              child: Padding(
                padding: EdgeInsets.all(tokens.spaceMd),
                child: Text(
                  errorMessage!,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onErrorContainer,
                  ),
                ),
              ),
            ),
          ),
        Expanded(
          child: LayoutBuilder(
            builder: (context, constraints) {
              return Scrollbar(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: ConstrainedBox(
                    constraints: BoxConstraints(minWidth: constraints.maxWidth),
                    child: SingleChildScrollView(
                      child: DataTable(
                        showCheckboxColumn: false,
                        headingRowHeight: 48,
                        dataRowMinHeight: 52,
                        dataRowMaxHeight: 72,
                        columns: [
                          for (final column in columns)
                            DataColumn(
                              label: Semantics(
                                header: true,
                                label: column.label,
                                child: Text(
                                  column.label,
                                  style: theme.textTheme.titleSmall,
                                ),
                              ),
                              numeric: column.numeric,
                            ),
                          if (showActions)
                            DataColumn(
                              label: Semantics(
                                header: true,
                                label: actionsLabel,
                                child: Text(
                                  actionsLabel,
                                  style: theme.textTheme.titleSmall,
                                ),
                              ),
                            ),
                        ],
                        rows: [
                          for (final row in rows)
                            DataRow(
                              onSelectChanged: onRowTap == null
                                  ? null
                                  : (_) => onRowTap!(row),
                              cells: [
                                for (final cell in cellsBuilder(context, row))
                                  DataCell(cell),
                                if (showActions)
                                  DataCell(
                                    _RowActionsButton(
                                      actionsLabel: actionsLabel,
                                      actions: rowActionsBuilder!(
                                        context,
                                        row,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        if (hasMore && onLoadMore != null)
          Padding(
            padding: EdgeInsets.only(top: tokens.spaceMd),
            child: Align(
              alignment: Alignment.center,
              child: loadingMore
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : OutlinedButton(
                      onPressed: onLoadMore,
                      child: Text(loadMoreLabel),
                    ),
            ),
          ),
      ],
    );
  }
}

class _RowActionsButton extends StatelessWidget {
  const _RowActionsButton({
    required this.actionsLabel,
    required this.actions,
  });

  final String actionsLabel;
  final List<AppDataRowAction> actions;

  @override
  Widget build(BuildContext context) {
    final enabled = actions.where((action) => action.onSelected != null);
    if (enabled.isEmpty) {
      return const SizedBox.shrink();
    }
    return Semantics(
      label: actionsLabel,
      button: true,
      child: PopupMenuButton<String>(
        tooltip: actionsLabel,
        onSelected: (id) {
          final match = actions.where((action) => action.id == id);
          if (match.isEmpty) {
            return;
          }
          match.first.onSelected?.call();
        },
        itemBuilder: (context) {
          return [
            for (final action in enabled)
              PopupMenuItem<String>(
                value: action.id,
                child: ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  leading: action.icon == null
                      ? null
                      : Icon(
                          action.icon,
                          color: action.isDestructive
                              ? Theme.of(context).colorScheme.error
                              : null,
                        ),
                  title: Text(
                    action.label,
                    style: action.isDestructive
                        ? TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          )
                        : null,
                  ),
                ),
              ),
          ];
        },
        icon: const Icon(Icons.more_vert),
      ),
    );
  }
}

/// Focusable filter chip that announces its selected state.
class AppFilterChip extends StatelessWidget {
  const AppFilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
    super.key,
  });

  final String label;
  final bool selected;
  final ValueChanged<bool> onSelected;

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: onSelected,
      showCheckmark: true,
    );
  }
}

/// Search field with clear affordance for directory filters.
class AppSearchField extends StatelessWidget {
  const AppSearchField({
    required this.controller,
    required this.label,
    required this.onChanged,
    this.onSubmitted,
    super.key,
  });

  final TextEditingController controller;
  final String label;
  final ValueChanged<String> onChanged;
  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      onSubmitted: onSubmitted,
      textInputAction: TextInputAction.search,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: const Icon(Icons.search),
        suffixIcon: controller.text.isEmpty
            ? null
            : IconButton(
                tooltip: 'Clear',
                onPressed: () {
                  controller.clear();
                  onChanged('');
                },
                icon: const Icon(Icons.clear),
              ),
        border: const OutlineInputBorder(),
      ),
      inputFormatters: [
        FilteringTextInputFormatter.deny(RegExp(r'[\n\r]')),
      ],
    );
  }
}
