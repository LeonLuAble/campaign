import 'package:api_client/api_client.dart';
import 'package:ui_kit/ui_kit.dart';

/// Builds a forest of [TreeListNode]s from a flat community list.
List<TreeListNode<Community>> buildCommunityTree(List<Community> flat) {
  final byParent = <String?, List<Community>>{};
  for (final community in flat) {
    final key = community.parentId;
    final list = byParent.putIfAbsent(key, () => <Community>[]);
    list.add(community);
  }
  for (final list in byParent.values) {
    list.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
  }

  TreeListNode<Community> buildNode(Community community) {
    final children = byParent[community.id] ?? const <Community>[];
    return TreeListNode(
      id: community.id,
      data: community,
      children: [for (final child in children) buildNode(child)],
    );
  }

  final roots = byParent[null] ?? const <Community>[];
  return [for (final root in roots) buildNode(root)];
}

/// Returns [nodeId] plus every descendant id under it in [flat].
Set<String> communitySubtreeIds(List<Community> flat, String nodeId) {
  final childrenOf = <String?, List<String>>{};
  for (final community in flat) {
    final list = childrenOf.putIfAbsent(community.parentId, () => <String>[]);
    list.add(community.id);
  }
  final result = <String>{nodeId};
  final queue = <String>[nodeId];
  while (queue.isNotEmpty) {
    final current = queue.removeLast();
    for (final child in childrenOf[current] ?? const <String>[]) {
      if (result.add(child)) {
        queue.add(child);
      }
    }
  }
  return result;
}
