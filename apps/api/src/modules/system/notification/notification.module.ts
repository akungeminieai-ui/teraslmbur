import { Module, Global } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { MockNotificationProvider } from './providers/mock-notification.provider';
import { SettingsModule } from '../settings/settings.module';

@Global()
@Module({
  imports: [SettingsModule],
  providers: [NotificationGateway, MockNotificationProvider],
  exports: [NotificationGateway],
})
export class NotificationModule {}
