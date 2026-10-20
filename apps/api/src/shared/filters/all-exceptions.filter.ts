import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  CORRELATION_ID_HEADER,
  resolveCorrelationId,
} from '../correlation/correlation-id.js';
import {
  isErrorCode,
  type ApiErrorResponse,
  type ErrorCode,
} from '../types/api-error.response.js';
import type { CorrelatedRequest } from '../types/correlated-request.js';

const STATUS_PHRASES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
};

const ERROR_CODES: Record<number, ErrorCode> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<CorrelatedRequest>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const { message, error } = this.describe(exception, status);
    const code = this.resolveErrorCode(exception, status);
    const details = this.resolveDetails(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        'Request failed',
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiErrorResponse = {
      statusCode: status,
      code,
      error,
      message,
      correlationId: request.id ?? this.headerCorrelationId(request),
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
      ...(details ? { details } : {}),
    };

    response.status(status).json(body);
  }

  private headerCorrelationId(request: CorrelatedRequest): string | null {
    const header = request.header(CORRELATION_ID_HEADER);
    if (!header) {
      return null;
    }

    return resolveCorrelationId(header);
  }

  private resolveDetails(
    exception: unknown,
  ): Record<string, unknown> | undefined {
    if (!(exception instanceof HttpException)) {
      return undefined;
    }
    const exceptionBody = exception.getResponse();
    if (typeof exceptionBody !== 'object' || exceptionBody === null) {
      return undefined;
    }
    const details = (exceptionBody as Record<string, unknown>).details;
    return typeof details === 'object' &&
      details !== null &&
      !Array.isArray(details)
      ? (details as Record<string, unknown>)
      : undefined;
  }

  private resolveErrorCode(exception: unknown, status: number): ErrorCode {
    if (exception instanceof HttpException) {
      const exceptionBody = exception.getResponse();
      if (typeof exceptionBody === 'object' && exceptionBody !== null) {
        const record = exceptionBody as Record<string, unknown>;

        if (typeof record.code === 'string' && isErrorCode(record.code)) {
          return record.code;
        }

        if (
          status === HttpStatus.BAD_REQUEST &&
          Array.isArray(record.message)
        ) {
          return 'VALIDATION_FAILED';
        }
      }
    }

    return ERROR_CODES[status] ?? 'INTERNAL_ERROR';
  }

  private describe(
    exception: unknown,
    status: number,
  ): { message: string | string[]; error: string } {
    const fallbackError = STATUS_PHRASES[status] ?? 'Error';

    if (!(exception instanceof HttpException)) {
      return {
        message: 'Internal server error',
        error:
          STATUS_PHRASES[HttpStatus.INTERNAL_SERVER_ERROR] ?? fallbackError,
      };
    }

    const exceptionBody = exception.getResponse();
    if (typeof exceptionBody === 'string') {
      return { message: exceptionBody, error: fallbackError };
    }

    if (typeof exceptionBody === 'object' && exceptionBody !== null) {
      const record = exceptionBody as Record<string, unknown>;
      return {
        message: this.normalizeMessage(record.message) ?? exception.message,
        error: typeof record.error === 'string' ? record.error : fallbackError,
      };
    }

    return { message: exception.message, error: fallbackError };
  }

  private normalizeMessage(message: unknown): string | string[] | undefined {
    if (typeof message === 'string') {
      return message;
    }

    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === 'string')
    ) {
      return message;
    }

    return undefined;
  }
}
