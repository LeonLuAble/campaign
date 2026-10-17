import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src/modules');
const GENERIC_MODULES = [
  'campaigns',
  'commitments',
  'localization',
  'actions',
  'progress',
] as const;

const FORBIDDEN = ['随缘素', '欢喜素', '定日素', '一周素', '全月素', '发愿素', '已全素'];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...walk(full));
    } else if (full.endsWith('.ts') && !full.endsWith('.spec.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('vegetarian copy isolation', () => {
  it('does not place vegetarian choice strings in generic modules', () => {
    const offenders: string[] = [];
    for (const moduleName of GENERIC_MODULES) {
      for (const file of walk(join(ROOT, moduleName))) {
        const source = readFileSync(file, 'utf8');
        for (const token of FORBIDDEN) {
          if (source.includes(token)) {
            offenders.push(`${file} contains ${token}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
