import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { parseCorsOrigins } from '../config/security-config.js';
import { correlationMiddleware } from '../shared/correlation/correlation-id.js';
import { AllExceptionsFilter } from '../shared/filters/all-exceptions.filter.js';

function readHttpSecurity(app: INestApplication): {
  helmetEnabled: boolean;
  corsOrigins: string[];
} {
  try {
    const config = app.get(ConfigService);
    return {
      helmetEnabled: config.get<boolean>('security.helmetEnabled') !== false,
      corsOrigins: config.get<string[]>('cors.origins') ?? [],
    };
  } catch {
    return {
      helmetEnabled: process.env.HELMET_ENABLED !== 'false',
      corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
    };
  }
}

export function configureApp(app: INestApplication): void {
  const httpServer = app.getHttpAdapter().getInstance() as {
    disable: (setting: string) => void;
  };
  httpServer.disable('x-powered-by');

  const { helmetEnabled, corsOrigins } = readHttpSecurity(app);
  if (helmetEnabled) {
    app.use(helmet());
  }

  if (corsOrigins.includes('*')) {
    app.enableCors({ origin: true });
  } else if (corsOrigins.length > 0) {
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
    });
  }

  app.use(correlationMiddleware);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
}
