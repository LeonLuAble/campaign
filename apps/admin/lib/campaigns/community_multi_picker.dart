import 'package:api_client/api_client.dart';
import 'package:flutter/material.dart';
import 'package:ui_kit/ui_kit.dart';

import '../communities/community_tree.dart';
import '../l10n/app_localizations.dart';

/// Checkbox tree for selecting one or more communities.
class CommunityMultiPicker extends StatelessWidget {
  const CommunityMultiPicker({
    required this.communities,
    required this.selectedIds,
    required this.onChanged,
    super.key,
  });

  final List<Community> communities;
  final Set<String> selectedIds;
  final ValueChanged<Set<String>> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final roots = buildCommunityTree(communities);
    if (roots.isEmpty) {
      return Text(l10n.noCommunities);
    }

    Widget buildNode(TreeListNode<Community> node, int depth) {
      final selected = selectedIds.contains(node.id);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.only(left: depth * 16.0),
            child: CheckboxListTile(
              dense: true,
              controlAffinity: ListTileControlAffinity.leading,
              title: Text(node.data.name),
              value: selected,
              onChanged: (value) {
                final next = Set<String>.from(selectedIds);
                if (value == true) {
                  next.add(node.id);
                } else {
                  next.remove(node.id);
                }
                onChanged(next);
              },
            ),
          ),
          for (final child in node.children) buildNode(child, depth + 1),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final root in roots) buildNode(root, 0),
      ],
    );
  }
}
