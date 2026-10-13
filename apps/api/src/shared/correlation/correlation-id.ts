import { randomUUID } from 'node:crypto';
import type { NextFunction, Response } from 'express';
import type { CorrelatedRequest } from '../types/correlated-request.js';

export const CORRELATION_ID_HEADER = 'x-request-id';

const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function resolveCorrelationId(candidate: string | undefined): string {
  if (candidate && CORRELATION_ID_PATTERN.test(candidate)) {
    return candidate;
  }

  return randomUUID();
}

export function correlationMiddleware(
  request: CorrelatedRequest,
  response: Response,
  next: NextFunction,
): void {
  const correlationId = resolveCorrelationId(
    request.header(CORRELATION_ID_HEADER),
  );
  request.id = correlationId;
  response.setHeader(CORRELATION_ID_HEADER, correlationId);
  next();
}
