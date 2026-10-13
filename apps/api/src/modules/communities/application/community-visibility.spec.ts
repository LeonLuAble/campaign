import { describe, expect, it } from 'vitest';
import {
  listAncestorIdsFrom,
  visibleCommunityIds,
  wouldCreateCycle,
} from './community-visibility.js';

const tree = [
  { id: 'root', parentId: null },
  { id: 'hq', parentId: 'root' },
  { id: 'branch', parentId: 'hq' },
  { id: 'other', parentId: 'root' },
];

describe('community visibility', () => {
  it('shows the full tree to tenant-level members', () => {
    expect(
      visibleCommunityIds(tree, [{ communityId: null, isActive: true }]),
    ).toEqual(new Set(['root', 'hq', 'branch', 'other']));
  });

  it('shows a community membership node and its descendants only', () => {
    expect(
      visibleCommunityIds(tree, [{ communityId: 'hq', isActive: true }]),
    ).toEqual(new Set(['hq', 'branch']));
  });
});

describe('community hierarchy', () => {
  it('walks ancestors toward the root', () => {
    expect(listAncestorIdsFrom(tree, 'branch')).toEqual(['hq', 'root']);
  });

  it('detects a cycle when moving a node under its descendant', () => {
    expect(wouldCreateCycle(tree, 'root', 'branch')).toBe(true);
    expect(wouldCreateCycle(tree, 'branch', 'other')).toBe(false);
    expect(wouldCreateCycle(tree, 'branch', null)).toBe(false);
  });
});
