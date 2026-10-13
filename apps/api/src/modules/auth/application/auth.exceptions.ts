import { UnauthorizedException } from '@nestjs/common';

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super({
      code: 'INVALID_CREDENTIALS',
      error: 'Unauthorized',
      message: 'Invalid credentials',
    });
  }
}

export class TokenInvalidException extends UnauthorizedException {
  constructor(message = 'Invalid or expired refresh token') {
    super({
      code: 'TOKEN_INVALID',
      error: 'Unauthorized',
      message,
    });
  }
}

export class TokenReusedException extends UnauthorizedException {
  constructor() {
    super({
      code: 'TOKEN_REUSED',
      error: 'Unauthorized',
      message: 'Refresh token has been reused',
    });
  }
}
