import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../domain/permission-keys.js';
import { PermissionsGuard } from './permissions.guard.js';
import { REQUIRE_PERMISSIONS_KEY } from './require-permission.decorator.js';

describe('PermissionsGuard', () => {
  const reflector = {
    getAllAndOverride: vi.fn(),
  } as unknown as Reflector;
  const guard = new PermissionsGuard(reflector);

  function contextWithPermissions(permissions: Set<string> | undefined) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          tenantContext: permissions ? { permissions } : undefined,
        }),
      }),
    };
  }

  it('allows the request when no permission is required', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(undefined);
    expect(guard.canActivate(contextWithPermissions(undefined) as never)).toBe(
      true,
    );
  });

  it('allows the request when the tenant context has the permission', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([
      PERMISSIONS.CUSTOMERS_UPDATE,
    ]);
    expect(
      guard.canActivate(
        contextWithPermissions(
          new Set([PERMISSIONS.CUSTOMERS_UPDATE]),
        ) as never,
      ),
    ).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      REQUIRE_PERMISSIONS_KEY,
      expect.any(Array),
    );
  });

  it('forbids the request when the permission is missing', () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([
      PERMISSIONS.CUSTOMERS_UPDATE,
    ]);
    expect(() =>
      guard.canActivate(
        contextWithPermissions(new Set([PERMISSIONS.CUSTOMERS_READ])) as never,
      ),
    ).toThrow(ForbiddenException);
  });
});
