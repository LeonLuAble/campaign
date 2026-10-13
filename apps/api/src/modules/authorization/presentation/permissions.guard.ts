import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessForbiddenException } from '../../../shared/errors/domain-http.exceptions.js';
import type { TenantContext } from '../application/tenant-context.js';
import { REQUIRE_PERMISSIONS_KEY } from './require-permission.decorator.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      tenantContext?: TenantContext;
    }>();
    const permissions = request.tenantContext?.permissions;
    if (!permissions || required.some((key) => !permissions.has(key))) {
      throw new AccessForbiddenException();
    }
    return true;
  }
}
