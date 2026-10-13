import { describe, expect, it } from 'vitest';
import { decideImportMatch } from './import-match.js';

describe('decideImportMatch', () => {
  it('creates a user when no identity exists', () => {
    expect(
      decideImportMatch({
        externalUserId: null,
        email: null,
        mobile: null,
        emailInTenant: false,
        mobileInTenant: false,
      }),
    ).toEqual({ action: 'create' });
  });

  it('matches an in-tenant email identity', () => {
    expect(
      decideImportMatch({
        externalUserId: null,
        email: { userId: 'user-a', isActive: true },
        mobile: null,
        emailInTenant: true,
        mobileInTenant: false,
      }),
    ).toEqual({ action: 'match', userId: 'user-a' });
  });

  it('does not auto-link an identity from another tenant', () => {
    expect(
      decideImportMatch({
        externalUserId: null,
        email: { userId: 'user-b', isActive: true },
        mobile: null,
        emailInTenant: false,
        mobileInTenant: false,
      }),
    ).toMatchObject({ action: 'review', code: 'EXISTING_IDENTITY' });
  });

  it('reviews when email and mobile resolve to different users', () => {
    expect(
      decideImportMatch({
        externalUserId: null,
        email: { userId: 'user-a', isActive: true },
        mobile: { userId: 'user-b', isActive: true },
        emailInTenant: true,
        mobileInTenant: true,
      }),
    ).toMatchObject({ action: 'review', code: 'IDENTITY_CONFLICT' });
  });

  it('prefers a previous external_id match in the tenant', () => {
    expect(
      decideImportMatch({
        externalUserId: 'user-a',
        email: { userId: 'user-a', isActive: true },
        mobile: null,
        emailInTenant: true,
        mobileInTenant: false,
      }),
    ).toEqual({ action: 'match', userId: 'user-a' });
  });

  it('reviews an inactive matched user', () => {
    expect(
      decideImportMatch({
        externalUserId: null,
        email: { userId: 'user-a', isActive: false },
        mobile: null,
        emailInTenant: true,
        mobileInTenant: false,
      }),
    ).toMatchObject({ action: 'review', code: 'USER_INACTIVE' });
  });
});
