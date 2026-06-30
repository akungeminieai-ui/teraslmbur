import { NestFactory } from '@nestjs/core';
import { VersioningType, RequestMethod } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use pino-logger for NestJS logging
  app.useLogger(app.get(Logger));

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  // Global prefixes and v1 versioning
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global Exception Filters and Interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env.API_PORT ? parseInt(process.env.API_PORT, 10) : 3001;
  await app.listen(port);
}
bootstrap();
