import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import configuration from './config/configuration';

@Module({
  imports: [
    // Global Config Module with schema validation integration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Structured Pino Logger module
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      },
    }),
    PrismaModule,
    AuthModule,
  ],
})
export class AppModule {}
