import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, NotificationPayload } from '../notification-provider.interface';

@Injectable()
export class MockNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(MockNotificationProvider.name);

  async send(payload: NotificationPayload): Promise<boolean> {
    this.logger.log(
      `📧 [MOCK MESSAGING GATEWAY] Sending payload to ${payload.to}:
       Subject: ${payload.subject || 'N/A'}
       Body: ${payload.body}
       Metadata: ${JSON.stringify(payload.metadata || {})}
      `,
    );
    return true;
  }

  async validate(payload: NotificationPayload): Promise<boolean> {
    return !!payload.to && !!payload.body;
  }

  async health(): Promise<boolean> {
    return true;
  }
}
