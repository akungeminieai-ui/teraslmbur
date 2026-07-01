import { Module, Global } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ThemeService } from './theme.service';
import { BrandingService } from './branding.service';
import { CurrencyService } from './currency.service';
import { TimezoneService } from './timezone.service';

@Global()
@Module({
  providers: [
    SettingsService,
    ThemeService,
    BrandingService,
    CurrencyService,
    TimezoneService,
  ],
  exports: [
    SettingsService,
    ThemeService,
    BrandingService,
    CurrencyService,
    TimezoneService,
  ],
})
export class SettingsModule {}
