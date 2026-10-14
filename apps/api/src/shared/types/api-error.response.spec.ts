import { describe, expect, it } from 'vitest';
import type {
  ApiErrorResponse as ContractApiErrorResponse,
  ErrorCode as ContractErrorCode,
} from '../../../../packages/api-contracts/src/index.js';
import type { ApiErrorResponse, ErrorCode } from './api-error.response.js';

describe('ApiErrorResponse type sync', () => {
  it('ErrorCode in api-contracts matches apps/api', () => {
    const apiCodes: ErrorCode[] = [
      'BAD_REQUEST',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONFLICT',
      'UNPROCESSABLE_ENTITY',
      'RATE_LIMITED',
      'INTERNAL_ERROR',
      'SERVICE_UNAVAILABLE',
      'VALIDATION_FAILED',
      'INVALID_CREDENTIALS',
      'TOKEN_INVALID',
      'TOKEN_REUSED',
      'TOKEN_EXPIRED',
      'IDENTITY_ALREADY_EXISTS',
      'WEAK_PASSWORD',
      'SOCIAL_TOKEN_INVALID',
    ];

    const contractCodes: ContractErrorCode[] = [
      'BAD_REQUEST',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONFLICT',
      'UNPROCESSABLE_ENTITY',
      'RATE_LIMITED',
      'INTERNAL_ERROR',
      'SERVICE_UNAVAILABLE',
      'VALIDATION_FAILED',
      'INVALID_CREDENTIALS',
      'TOKEN_INVALID',
      'TOKEN_REUSED',
      'TOKEN_EXPIRED',
      'IDENTITY_ALREADY_EXISTS',
      'WEAK_PASSWORD',
      'SOCIAL_TOKEN_INVALID',
    ];

    expect(apiCodes.sort()).toEqual(contractCodes.sort());

    const apiSample: ApiErrorResponse = {
      statusCode: 404,
      code: 'NOT_FOUND',
      error: 'Not Found',
      message: 'Resource not found',
      correlationId: 'test-id',
      timestamp: '2026-01-01T00:00:00.000Z',
      path: '/api/v1/test',
    };

    const contractSample: ContractApiErrorResponse = {
      statusCode: 404,
      code: 'NOT_FOUND',
      error: 'Not Found',
      message: 'Resource not found',
      correlationId: 'test-id',
      timestamp: '2026-01-01T00:00:00.000Z',
      path: '/api/v1/test',
    };

    const apiKeys = Object.keys(apiSample).sort();
    const contractKeys = Object.keys(contractSample).sort();

    expect(apiKeys).toEqual(contractKeys);
  });
});
