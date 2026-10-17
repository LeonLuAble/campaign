import { describe, expect, it } from 'vitest';
import {
  buildCommunityPathIndex,
  normalizeCommunityPath,
} from './community-path.js';

describe('community path', () => {
  it('indexes exact root-relative paths', () => {
    const index = buildCommunityPathIndex([
      { id: 'r', parentId: null, name: 'Region' },
      { id: 'b', parentId: 'r', name: 'Branch' },
      { id: 'g', parentId: 'b', name: 'Group' },
    ]);
    expect(index.get('Region')).toBe('r');
    expect(index.get('Region/Branch')).toBe('b');
    expect(index.get('Region/Branch/Group')).toBe('g');
    expect(index.get('Branch')).toBeUndefined();
  });

  it('normalizes slashes and whitespace', () => {
    expect(normalizeCommunityPath(' Region / Branch / ')).toBe(
      'Region/Branch',
    );
  });
});
