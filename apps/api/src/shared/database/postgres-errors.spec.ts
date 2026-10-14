import { describe, expect, it } from 'vitest';
import { QueryFailedError } from 'typeorm';
import {
  isCheckViolation,
  isForeignKeyViolation,
  isRaiseException,
  isUniqueViolation,
} from './postgres-errors.js';

function queryError(code: string): QueryFailedError {
  const driver = Object.assign(new Error('driver'), { code });
  const error = new QueryFailedError('SELECT 1', [], driver);
  (
    error as QueryFailedError & { driverError: Error & { code: string } }
  ).driverError = driver;
  return error;
}

describe('postgres-errors', () => {
  it('detects unique, foreign-key, check, and raise codes', () => {
    expect(isUniqueViolation(queryError('23505'))).toBe(true);
    expect(isForeignKeyViolation(queryError('23503'))).toBe(true);
    expect(isCheckViolation(queryError('23514'))).toBe(true);
    expect(isRaiseException(queryError('P0001'))).toBe(true);
  });

  it('rejects unknown errors', () => {
    expect(isUniqueViolation(new Error('nope'))).toBe(false);
    expect(isUniqueViolation(queryError('23503'))).toBe(false);
  });
});
