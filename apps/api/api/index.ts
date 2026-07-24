import { NestFactory } from '@nestjs/core';
import { VersioningType, RequestMethod } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from '../dist/src/app.module';
import { HttpExceptionFilter } from '../dist/src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../dist/src/common/interceptors/transform.interceptor';
import { LoggingInterceptor } from '../dist/src/common/interceptors/logging.interceptor';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();
let cachedServer: any;

async function bootstrapServerless() {
  if (!cachedServer) {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
      { bufferLogs: true }
    );

    app.useLogger(app.get(Logger));

    const configuredOrigins = (process.env['CORS_ORIGIN'] ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    app.enableCors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (
          !origin ||
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1') ||
          configuredOrigins.includes(origin) ||
          origin.includes('vercel.app')
        ) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
    });

    app.setGlobalPrefix('api', {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor());

    await app.init();
    cachedServer = server;
  }
  return cachedServer;
}

export default async function handler(req: any, res: any) {
  const expressApp = await bootstrapServerless();
  return expressApp(req, res);
}
