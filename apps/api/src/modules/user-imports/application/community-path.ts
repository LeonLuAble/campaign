export interface CommunityPathNode {
  id: string;
  parentId: string | null;
  name: string;
}

/**
 * Builds a map from exact root-relative path (`Region/Branch`) to community id.
 * Names are matched case-sensitively after trim; segments are split on `/`.
 */
export function buildCommunityPathIndex(
  nodes: CommunityPathNode[],
): Map<string, string> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const index = new Map<string, string>();

  for (const node of nodes) {
    const segments: string[] = [];
    let current: CommunityPathNode | undefined = node;
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      segments.unshift(current.name.trim());
      current = current.parentId
        ? byId.get(current.parentId)
        : undefined;
    }
    if (segments.length === 0) {
      continue;
    }
    const path = segments.join('/');
    // First wins if duplicate paths exist.
    if (!index.has(path)) {
      index.set(path, node.id);
    }
  }

  return index;
}

export function normalizeCommunityPath(path: string): string {
  return path
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join('/');
}
