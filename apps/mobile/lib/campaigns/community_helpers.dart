import 'package:api_client/api_client.dart';
import 'package:ui_kit/ui_kit.dart';

/// Builds a forest of [TreeListNode]s from a flat community list.
List<TreeListNode<Community>> buildCommunityForest(List<Community> communities) {
  final byParent = <String?, List<Community>>{};
  for (final row in communities) {
    byParent.putIfAbsent(row.parentId, () => []).add(row);
  }
  for (final list in byParent.values) {
    list.sort((a, b) => a.name.compareTo(b.name));
  }

  List<TreeListNode<Community>> build(String? parentId) {
    final children = byParent[parentId] ?? const <Community>[];
    return [
      for (final row in children)
        TreeListNode(
          id: row.id,
          data: row,
          children: build(row.id),
        ),
    ];
  }

  return build(null);
}

/// Subtree rooted at [rootId] (inclusive), or the full forest if null/missing.
List<TreeListNode<Community>> communitySubtree({
  required List<Community> communities,
  String? rootId,
}) {
  final forest = buildCommunityForest(communities);
  if (rootId == null || rootId.isEmpty) {
    return forest;
  }
  TreeListNode<Community>? find(List<TreeListNode<Community>> nodes) {
    for (final node in nodes) {
      if (node.id == rootId) {
        return node;
      }
      final nested = find(node.children);
      if (nested != null) {
        return nested;
      }
    }
    return null;
  }

  final match = find(forest);
  return match == null ? forest : [match];
}

List<TimeSeriesBucket> dashboardTimeBuckets(AggregateDashboard dashboard) {
  return [
    for (final point in dashboard.timeSeries)
      TimeSeriesBucket(
        label: '${point.periodStart} – ${point.periodEnd}',
        value: point.measurements.isEmpty
            ? 0
            : point.measurements.first.quantity.toDouble(),
      ),
  ];
}

bool isMilestoneNotification(InboxNotification item) =>
    item.type == 'milestone_achieved';

bool isCampaignCompletedNotification(InboxNotification item) =>
    item.type == 'campaign_completed' || item.type == 'campaign_ended';

bool isCelebrationNotification(InboxNotification item) =>
    isMilestoneNotification(item) || isCampaignCompletedNotification(item);
