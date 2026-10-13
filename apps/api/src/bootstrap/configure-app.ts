import { INestApplication, ValidationPipe } from '@nestjs/common';
import { correlationMiddleware } from '../shared/correlation/correlation-id.js';
import { AllExceptionsFilter } from '../shared/filters/all-exceptions.filter.js';

export function configureApp(app: INestApplication): void {
  const httpServer = app.getHttpAdapter().getInstance() as {
    disable: (setting: string) => void;
  };
  httpServer.disable('x-powered-by');
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
