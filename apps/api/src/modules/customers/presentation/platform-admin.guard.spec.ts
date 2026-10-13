import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';
import { PlatformAdminGuard } from './platform-admin.guard.js';

describe('PlatformAdminGuard', () => {
  const identities = { isPlatformAdmin: vi.fn() };
  const guard = new PlatformAdminGuard(
    identities as unknown as IdentityAccountService,
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  function contextWithUser(userId: string | undefined) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: userId ? { userId } : undefined,
        }),
      }),
    };
  }

  it('rejects unauthenticated requests', async () => {
    await expect(
      guard.canActivate(contextWithUser(undefined) as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects users who are not platform admins', async () => {
    identities.isPlatformAdmin.mockResolvedValue(false);
    await expect(
      guard.canActivate(contextWithUser('user-1') as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a platform admin', async () => {
    identities.isPlatformAdmin.mockResolvedValue(true);
    await expect(
      guard.canActivate(contextWithUser('user-1') as never),
    ).resolves.toBe(true);
  });
});
