import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

export class SetupNotAvailableException extends ConflictException {
  constructor(message = 'First-admin setup is not available') {
    super({
      code: 'SETUP_NOT_AVAILABLE',
      error: 'Conflict',
      message,
    });
  }
}

export class InvalidSetupKeyException extends UnauthorizedException {
  constructor(message = 'Invalid setup key') {
    super({
      code: 'INVALID_SETUP_KEY',
      error: 'Unauthorized',
      message,
    });
  }
}
