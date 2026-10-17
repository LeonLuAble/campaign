import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { matchAcceptLanguage } from '../application/accept-language.js';
import type { SupportedLocale } from '../application/locale-catalog.js';

export const AcceptLanguage = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SupportedLocale => {
    const request = ctx.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
    }>();
    return matchAcceptLanguage(request.headers?.['accept-language']);
  },
);
