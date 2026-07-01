import { Injectable } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Injectable()
export class ThemeService {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Generates a collection of design tokens mapped to CSS custom properties.
   * Exposes dynamic colors, border-radii, typography, and speed tokens.
   */
  async getThemeTokens(outletId?: string): Promise<Record<string, string>> {
    const keysMap: Record<string, string> = {
      'brand.primary': 'brand_primary',
      'brand.secondary': 'brand_secondary',
      'brand.accent': 'brand_accent',
      'brand.success': 'brand_success',
      'brand.warning': 'brand_warning',
      'brand.error': 'brand_error',
      'surface.background': 'surface_background',
      'surface.card': 'surface_card',
      'sidebar.width': 'sidebar_width',
      'sidebar.background': 'sidebar_background',
      'border.radius': 'border_radius',
      'font.heading': 'font_heading',
      'font.body': 'font_body',
      'shadow.card': 'shadow_card',
      'animation.speed': 'animation_speed',
    };

    const tokens: Record<string, string> = {};
    for (const [tokenName, settingKey] of Object.entries(keysMap)) {
      try {
        tokens[tokenName] = await this.settingsService.get(settingKey, outletId);
      } catch (e) {
        // Fallback placeholder defaults if key is undefined
        tokens[tokenName] = '';
      }
    }

    return tokens;
  }
}
