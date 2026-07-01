import { Injectable } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Injectable()
export class CurrencyService {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Resolves target operational currency (e.g. EGP, IDR, USD).
   */
  async getCurrency(outletId?: string): Promise<string> {
    try {
      return await this.settingsService.get('currency', outletId);
    } catch (e) {
      return 'EGP'; // Default fallback
    }
  }
}
