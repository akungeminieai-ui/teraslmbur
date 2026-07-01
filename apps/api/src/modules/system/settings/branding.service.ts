import { Injectable } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Injectable()
export class BrandingService {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Retrieves full brand identifiers (logos, headers, contacts).
   */
  async getBranding(outletId?: string) {
    const keys = [
      'brand_name',
      'brand_logo',
      'app_logo',
      'store_name',
      'store_phone',
      'store_email',
      'store_address',
      'receipt_footer',
    ];

    const branding: Record<string, string> = {};
    for (const key of keys) {
      try {
        branding[key] = await this.settingsService.get(key, outletId);
      } catch (e) {
        branding[key] = '';
      }
    }

    return branding;
  }
}
