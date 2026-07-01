import { Injectable } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Injectable()
export class TimezoneService {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Resolves target operational timezone (e.g. Africa/Cairo).
   */
  async getTimezone(outletId?: string): Promise<string> {
    try {
      return await this.settingsService.get('timezone', outletId);
    } catch (e) {
      return 'Africa/Cairo'; // Default fallback
    }
  }
}
