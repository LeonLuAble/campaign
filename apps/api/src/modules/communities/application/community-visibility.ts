export interface HierarchyNode {
  id: string;
  parentId: string | null;
}

export function buildChildMap(nodes: HierarchyNode[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentId) {
      continue;
    }
    const list = children.get(node.parentId) ?? [];
    list.push(node.id);
    children.set(node.parentId, list);
  }
  return children;
}

export function listDescendantIdsFrom(
  nodes: HierarchyNode[],
  rootId: string,
): string[] {
  const children = buildChildMap(nodes);
  const descendants: string[] = [];
  const queue = [...(children.get(rootId) ?? [])];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current || seen.has(current)) {
      continue;
    }
    seen.add(current);
    descendants.push(current);
    queue.push(...(children.get(current) ?? []));
  }
  return descendants;
}

export function listAncestorIdsFrom(
  nodes: HierarchyNode[],
  nodeId: string,
): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const ancestors: string[] = [];
  const seen = new Set<string>();
  let current = byId.get(nodeId)?.parentId ?? null;
  while (current && !seen.has(current)) {
    seen.add(current);
    ancestors.push(current);
    current = byId.get(current)?.parentId ?? null;
  }
  return ancestors;
}

export function wouldCreateCycle(
  nodes: HierarchyNode[],
  nodeId: string,
  newParentId: string | null,
): boolean {
  if (!newParentId) {
    return false;
  }
  if (newParentId === nodeId) {
    return true;
  }
  return listAncestorIdsFrom(nodes, newParentId).includes(nodeId);
}

export function visibleCommunityIds(
  nodes: HierarchyNode[],
  memberships: Array<{ communityId: string | null; isActive: boolean }>,
): Set<string> {
  const active = memberships.filter((membership) => membership.isActive);
  if (active.some((membership) => membership.communityId === null)) {
    return new Set(nodes.map((node) => node.id));
  }

  const visible = new Set<string>();
  const known = new Set(nodes.map((node) => node.id));
  for (const membership of active) {
    if (!membership.communityId || !known.has(membership.communityId)) {
      continue;
    }
    visible.add(membership.communityId);
    for (const descendantId of listDescendantIdsFrom(
      nodes,
      membership.communityId,
    )) {
      visible.add(descendantId);
    }
  }
  return visible;
}
