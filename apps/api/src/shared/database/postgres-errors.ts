import { QueryFailedError } from 'typeorm';

function driverCode(error: unknown): string | undefined {
  if (!(error instanceof QueryFailedError)) {
    return undefined;
  }
  const driverError = error.driverError as { code?: string } | undefined;
  return driverError?.code;
}

export function isUniqueViolation(error: unknown): boolean {
  return driverCode(error) === '23505';
}

export function isForeignKeyViolation(error: unknown): boolean {
  return driverCode(error) === '23503';
}

export function isCheckViolation(error: unknown): boolean {
  return driverCode(error) === '23514';
}

export function isRaiseException(error: unknown): boolean {
  return driverCode(error) === 'P0001';
}
