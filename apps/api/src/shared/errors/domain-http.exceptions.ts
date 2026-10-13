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
  constructor(message = 'Resource already exists') {
    super({
      code: 'CONFLICT',
      error: 'Conflict',
      message,
    });
  }
}

export class InvalidRequestException extends BadRequestException {
  constructor(message = 'Invalid request') {
    super({
      code: 'BAD_REQUEST',
      error: 'Bad Request',
      message,
    });
  }
}
