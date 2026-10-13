import { describe, expect, it } from 'vitest';
import { assertDemoSeedAllowed } from './seed-demo.guard.js';

describe('assertDemoSeedAllowed', () => {
  it('allows development and test', () => {
    expect(() => assertDemoSeedAllowed('development')).not.toThrow();
    expect(() => assertDemoSeedAllowed('test')).not.toThrow();
    expect(() => assertDemoSeedAllowed(undefined)).not.toThrow();
  });

  it('refuses production', () => {
    expect(() => assertDemoSeedAllowed('production')).toThrow(
      /disabled when NODE_ENV=production/,
    );
  });
});
