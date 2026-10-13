import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantContextService } from '../application/tenant-context.service.js';
import type { TenantContext } from '../application/tenant-context.js';

interface ScopedRequest {
  user?: { userId: string };
  params: Record<string, string | undefined>;
  query: Record<string, unknown>;
  body?: Record<string, unknown>;
  tenantContext?: TenantContext;
}

function readId(
  source: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const value = source?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

@Injectable()
export class TenantScopeGuard implements CanActivate {
  constructor(private readonly tenantContextService: TenantContextService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ScopedRequest>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    request.tenantContext = await this.tenantContextService.build(userId, {
      customerId:
        request.params.customerId ??
        readId(request.query, 'customerId') ??
        readId(request.body, 'customerId'),
      communityId:
        request.params.communityId ?? readId(request.body, 'communityId'),
      membershipId: request.params.membershipId ?? null,
      roleId: request.params.roleId ?? null,
      parentId: readId(request.body, 'parentId'),
      campaignId: request.params.campaignId ?? null,
      templateId:
        request.params.templateId ?? readId(request.body, 'templateId'),
      scopeId: request.params.scopeId ?? readId(request.body, 'scopeId'),
      participationId: request.params.participationId ?? null,
    });
    return true;
  }
}
