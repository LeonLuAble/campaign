import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class ResourceNotFoundException extends NotFoundException {
  constructor(message = 'Resource not found') {
    super({
      code: 'NOT_FOUND',
      error: 'Not Found',
      message,
    });
  }
}

export class AccessForbiddenException extends ForbiddenException {
  constructor(message = 'Insufficient permissions') {
    super({
      code: 'FORBIDDEN',
      error: 'Forbidden',
      message,
    });
  }
}

export class ResourceConflictException extends ConflictException {
  constructor(
    message = 'Resource already exists',
    code = 'CONFLICT',
    details?: Record<string, unknown>,
  ) {
    super({
      code,
      error: 'Conflict',
      message,
      ...(details ? { details } : {}),
    });
  }
}

export class InvalidRequestException extends BadRequestException {
  constructor(
    message = 'Invalid request',
    code = 'BAD_REQUEST',
    details?: Record<string, unknown>,
  ) {
    super({
      code,
      error: 'Bad Request',
      message,
      ...(details ? { details } : {}),
    });
  }
}
