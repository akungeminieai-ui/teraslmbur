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
import { UserModule } from './modules/system/user/user.module';
import { RequestContextService } from './modules/system/context/request-context.service';
import { MasterModule } from './modules/master/master.module';
import { OperationsModule } from './modules/operations/operations.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import configuration from './config/configuration';

@Module({
  imports: [
    // Global Config Module with schema validation integration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../../.env'],
    }),
    // Structured Pino Logger module
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env['NODE_ENV'] !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env['NODE_ENV'] !== 'production' ? 'debug' : 'info',
        customProps(_req: any, _res: any) {
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
    UserModule,
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
    MasterModule,
    OperationsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
