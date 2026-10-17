import { describe, expect, it } from 'vitest';
import {
  buildMembershipUserSummary,
  decodeMembershipCursor,
  encodeMembershipCursor,
  escapeIlikePattern,
  resolveActivationStatus,
} from './membership-directory.js';

describe('membership directory helpers', () => {
  it('resolves activation status from verified identities', () => {
    expect(resolveActivationStatus([{ isVerified: false }])).toBe('pending');
    expect(
      resolveActivationStatus([{ isVerified: false }, { isVerified: true }]),
    ).toBe('active');
  });

  it('includes contact fields only for tenant-level callers', () => {
    const identities = [
      { type: 'email', identifier: 'a@example.com', isVerified: true },
      { type: 'mobile', identifier: '+60123456789', isVerified: false },
    ];

    expect(
      buildMembershipUserSummary({
        id: 'u1',
        displayName: 'Ada',
        identities,
        includeContacts: true,
      }),
    ).toEqual({
      id: 'u1',
      displayName: 'Ada',
      email: 'a@example.com',
      mobile: '+60123456789',
      activationStatus: 'active',
    });

    expect(
      buildMembershipUserSummary({
        id: 'u1',
        displayName: 'Ada',
        identities,
        includeContacts: false,
      }),
    ).toEqual({
      id: 'u1',
      displayName: 'Ada',
      activationStatus: 'active',
    });
  });

  it('round-trips membership cursors', () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const cursor = encodeMembershipCursor(createdAt, 'mid-1');
    expect(decodeMembershipCursor(cursor)).toEqual({
      createdAt,
      id: 'mid-1',
    });
  });

  it('escapes ILIKE wildcards', () => {
    expect(escapeIlikePattern('a%b_c\\d')).toBe('a\\%b\\_c\\\\d');
  });
});
