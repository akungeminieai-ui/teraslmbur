import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/system/auth/auth.module';
import { QueueModule } from './modules/system/queue/queue.module';
import { AuditModule } from './modules/system/audit/audit.module';
import { SequenceModule } from './modules/system/sequence/sequence.module';
import { BusinessCalendarModule } from './modules/system/calendar/calendar.module';
import { TranslationModule } from './modules/system/translation/translation.module';
import { RedisModule } from './modules/system/redis/redis.module';
import { SettingsModule } from './modules/system/settings/settings.module';
import { RequestContextModule } from './modules/system/context/request-context.module';
import { HealthModule } from './modules/system/health/health.module';
import { EventBusModule } from './modules/system/event-bus/event-bus.module';
import { NotificationModule } from './modules/system/notification/notification.module';
import { StorageModule } from './modules/system/storage/storage.module';
import { FeatureFlagModule } from './modules/system/feature-flag/feature-flag.module';
import { RequestContextService } from './modules/system/context/request-context.service';
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
        customProps(req: any, res: any) {
          const store = RequestContextService.getStore();
          return {
            requestId: store?.requestId,
            correlationId: store?.correlationId,
            traceId: store?.traceId,
            userId: store?.userId,
            outletId: store?.outletId,
            shiftId: store?.shiftId,
            businessDate: store?.businessDate,
          };
        },
      },
    }),
    PrismaModule,
    AuthModule,
    QueueModule,
    AuditModule,
    SequenceModule,
    BusinessCalendarModule,
    TranslationModule,
    RedisModule,
    SettingsModule,
    RequestContextModule,
    HealthModule,
    EventBusModule,
    NotificationModule,
    StorageModule,
    FeatureFlagModule,
  ],
})
export class AppModule {}
