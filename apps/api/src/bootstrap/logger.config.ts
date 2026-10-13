import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ConfigService } from '@nestjs/config';
import {
  CORRELATION_ID_HEADER,
  resolveCorrelationId,
} from '../shared/correlation/correlation-id.js';

export function createLoggerParams(config: ConfigService) {
  const isDevelopment = config.get<string>('nodeEnv') === 'development';

  return {
    pinoHttp: {
      level: isDevelopment ? 'debug' : 'info',
      genReqId: (request: IncomingMessage, response: ServerResponse) => {
        const header = request.headers[CORRELATION_ID_HEADER];
        const value = Array.isArray(header) ? header[0] : header;
        const correlationId = resolveCorrelationId(value);
        response.setHeader(CORRELATION_ID_HEADER, correlationId);
        return correlationId;
      },
      customProps: (request: IncomingMessage & { id?: string }) => ({
        correlationId: request.id,
      }),
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
        'req.body.refreshToken',
        'req.body.idToken',
      ],
      transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              colorize: true,
            },
          }
        : undefined,
    },
  };
}
