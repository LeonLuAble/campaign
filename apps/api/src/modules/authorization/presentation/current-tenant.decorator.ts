import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantContext } from '../application/tenant-context.js';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext => {
    const request = context.switchToHttp().getRequest<{
      tenantContext: TenantContext;
    }>();
    return request.tenantContext;
  },
);
