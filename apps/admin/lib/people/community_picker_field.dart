import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

import '../communities/community_tree.dart';
import '../l10n/app_localizations.dart';

/// Tree-based community picker used by People filters and invite dialog.
class CommunityPickerField extends StatelessWidget {
  const CommunityPickerField({
    required this.communities,
    required this.value,
    required this.onChanged,
    this.label,
    this.allowClear = true,
    this.required = false,
    super.key,
  });

  final List<Community> communities;
  final String? value;
  final ValueChanged<String?> onChanged;
  final String? label;
  final bool allowClear;
  final bool required;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final matches = value == null
        ? const <Community>[]
        : communities.where((row) => row.id == value).toList();
    final selected = matches.isEmpty ? null : matches.first;
    return InputDecorator(
      decoration: InputDecoration(
        labelText: label ?? l10n.peopleFilterCommunity,
        border: const OutlineInputBorder(),
        suffixIcon: allowClear && value != null
            ? IconButton(
                tooltip: l10n.clearFilter,
                onPressed: () => onChanged(null),
                icon: const Icon(Icons.clear),
              )
            : const Icon(Icons.account_tree_outlined),
      ),
      child: InkWell(
        onTap: () async {
          final picked = await showCommunityPickerDialog(
            context: context,
            communities: communities,
            selectedId: value,
            allowClear: allowClear && !required,
          );
          if (picked != null || allowClear) {
            // Dialog returns a sentinel for clear via empty string.
            if (picked == '') {
              onChanged(null);
            } else if (picked != null) {
              onChanged(picked);
            }
          }
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Text(
            selected?.name ??
                (required ? l10n.pickCommunityRequired : l10n.anyCommunity),
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        ),
      ),
    );
  }
}

/// Returns the selected community id, `''` when cleared, or `null` if cancelled.
Future<String?> showCommunityPickerDialog({
  required BuildContext context,
  required List<Community> communities,
  String? selectedId,
  bool allowClear = true,
}) {
  final l10n = AppLocalizations.of(context);
  final tree = buildCommunityTree(communities);
  var current = selectedId;

  return showDialog<String>(
    context: context,
    builder: (context) {
      return StatefulBuilder(
        builder: (context, setDialogState) {
          Widget tile({
            required String title,
            required String? id,
            required int depth,
          }) {
            final selected = current == id;
            return ListTile(
              contentPadding: EdgeInsets.only(left: 8.0 + depth * 16),
              leading: Icon(
                selected ? Icons.radio_button_checked : Icons.radio_button_off,
              ),
              title: Text(title),
              selected: selected,
              onTap: () => setDialogState(() => current = id),
            );
          }

          List<Widget> treeTiles(
            List<TreeListNode<Community>> nodes,
            int depth,
          ) {
            final tiles = <Widget>[];
            for (final node in nodes) {
              tiles.add(
                tile(title: node.data.name, id: node.data.id, depth: depth),
              );
              tiles.addAll(treeTiles(node.children, depth + 1));
            }
            return tiles;
          }

          return AlertDialog(
            title: Text(l10n.pickCommunityTitle),
            content: SizedBox(
              width: 420,
              height: 360,
              child: communities.isEmpty
                  ? EmptyState(message: l10n.noCommunities)
                  : ListView(
                      children: [
                        if (allowClear)
                          tile(
                            title: l10n.anyCommunity,
                            id: null,
                            depth: 0,
                          ),
                        if (allowClear) const Divider(),
                        ...treeTiles(tree, 0),
                      ],
                    ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(l10n.cancel),
              ),
              FilledButton(
                onPressed: () =>
                    Navigator.of(context).pop(current ?? ''),
                child: Text(l10n.save),
              ),
            ],
          );
        },
      );
    },
  );
}
