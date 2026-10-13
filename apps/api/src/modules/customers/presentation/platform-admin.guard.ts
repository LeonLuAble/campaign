import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AccessForbiddenException } from '../../../shared/errors/domain-http.exceptions.js';
import { IdentityAccountService } from '../../identity/application/identity-account.service.js';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly identities: IdentityAccountService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: { userId: string };
    }>();
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
    if (!(await this.identities.isPlatformAdmin(userId))) {
      throw new AccessForbiddenException(
        'Only platform admins can create customers',
      );
    }
    return true;
  }
}
