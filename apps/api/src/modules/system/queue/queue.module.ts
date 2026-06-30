import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        return {
          connection: {
            url,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: 'PrintQueue' },
      { name: 'NotificationQueue' },
      { name: 'ReportQueue' }
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
