import { describe, expect, it } from 'vitest';
import { ERROR_CODES, type ErrorCode } from './api-error.response.js';

describe('ApiErrorResponse error codes', () => {
  it('includes setup and auth codes used by the API', () => {
    const required: ErrorCode[] = [
      'INVALID_CREDENTIALS',
      'SETUP_NOT_AVAILABLE',
      'INVALID_SETUP_KEY',
      'IDENTITY_ALREADY_EXISTS',
      'WEAK_PASSWORD',
    ];

    for (const code of required) {
      expect(ERROR_CODES).toContain(code);
    }
  });
});
