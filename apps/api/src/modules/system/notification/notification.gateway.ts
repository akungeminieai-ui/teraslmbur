import { Injectable, Logger } from '@nestjs/common';
import { MockNotificationProvider } from './providers/mock-notification.provider';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class NotificationGateway {
  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    private readonly mockProvider: MockNotificationProvider,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Dispatches a message through target channel using dynamically resolved providers.
   */
  async send(channel: 'whatsapp' | 'email' | 'sms' | 'push' | 'telegram', to: string, body: string, subject?: string): Promise<boolean> {
    this.logger.debug(`📱 Dispatching notification via channel: ${channel} to: ${to}`);

    // Resolve provider from database configurations if needed (we map to mock for this scope)
    const providerKey = `notification_provider_${channel}`;
    let providerName = 'MOCK';
    try {
      providerName = await this.settingsService.get(providerKey);
    } catch (e) {
      // Fallback to MOCK
    }

    // Currently we route everything to our robust Mock Provider
    if (providerName === 'MOCK' || !providerName) {
      return this.mockProvider.send({
        to,
        subject,
        body,
        metadata: { channel },
      });
    }

    this.logger.warn(`⚠️ Configuration maps to unknown provider driver: ${providerName}. Falling back to MOCK.`);
    return this.mockProvider.send({ to, subject, body, metadata: { channel, fallback: true } });
  }

  async whatsapp(to: string, message: string): Promise<boolean> {
    return this.send('whatsapp', to, message);
  }

  async email(to: string, subject: string, body: string): Promise<boolean> {
    return this.send('email', to, body, subject);
  }

  async sms(to: string, message: string): Promise<boolean> {
    return this.send('sms', to, message);
  }

  async push(to: string, title: string, body: string): Promise<boolean> {
    return this.send('push', to, body, title);
  }

  async telegram(to: string, message: string): Promise<boolean> {
    return this.send('telegram', to, message);
  }
}
