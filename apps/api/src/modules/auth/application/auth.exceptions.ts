import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super({
      code: 'INVALID_CREDENTIALS',
      error: 'Unauthorized',
      message: 'Invalid credentials',
    });
  }
}

export class SocialTokenInvalidException extends UnauthorizedException {
  constructor(message = 'Invalid social identity token') {
    super({
      code: 'SOCIAL_TOKEN_INVALID',
      error: 'Unauthorized',
      message,
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

export class TokenExpiredException extends BadRequestException {
  constructor(message = 'Token has expired') {
    super({
      code: 'TOKEN_EXPIRED',
      error: 'Bad Request',
      message,
    });
  }
}

export class ActivationTokenInvalidException extends BadRequestException {
  constructor(message = 'Invalid activation or reset token') {
    super({
      code: 'TOKEN_INVALID',
      error: 'Bad Request',
      message,
    });
  }
}

export class IdentityAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      code: 'IDENTITY_ALREADY_EXISTS',
      error: 'Conflict',
      message: 'An account with this identifier already exists',
    });
  }
}

export class WeakPasswordException extends BadRequestException {
  constructor(message = 'Password does not meet the minimum policy') {
    super({
      code: 'WEAK_PASSWORD',
      error: 'Bad Request',
      message,
    });
  }
}

export class InvalidIdentifierException extends BadRequestException {
  constructor(message = 'Invalid identifier') {
    super({
      code: 'BAD_REQUEST',
      error: 'Bad Request',
      message,
    });
  }
}
