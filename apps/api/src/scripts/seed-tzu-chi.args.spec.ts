import { describe, expect, it } from 'vitest';
import { readSeedAdminEmail } from './seed-tzu-chi.args.js';

describe('readSeedAdminEmail', () => {
  it('reads --email value', () => {
    expect(
      readSeedAdminEmail(['node', 'seed', '--email', 'admin@example.com'], {}),
    ).toBe('admin@example.com');
  });

  it('reads --email= value', () => {
    expect(readSeedAdminEmail(['--email=ops@example.com'], {})).toBe(
      'ops@example.com',
    );
  });

  it('falls back to SEED_ADMIN_EMAIL', () => {
    expect(
      readSeedAdminEmail([], { SEED_ADMIN_EMAIL: 'env@example.com' }),
    ).toBe('env@example.com');
  });

  it('returns null when missing', () => {
    expect(readSeedAdminEmail(['--email'], {})).toBeNull();
    expect(readSeedAdminEmail([], {})).toBeNull();
  });
});
