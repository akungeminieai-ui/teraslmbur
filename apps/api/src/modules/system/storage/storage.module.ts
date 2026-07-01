import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { R2StorageProvider } from './providers/r2-storage.provider';
import { SettingsModule } from '../settings/settings.module';

@Global()
@Module({
  imports: [SettingsModule],
  providers: [StorageService, R2StorageProvider],
  exports: [StorageService],
})
export class StorageModule {}
