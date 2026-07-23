import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';
import { R2StorageProvider } from './providers/r2-storage.provider';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { SettingsModule } from '../settings/settings.module';

@Global()
@Module({
  imports: [SettingsModule],
  providers: [StorageService, R2StorageProvider, LocalStorageProvider],
  exports: [StorageService],
})
export class StorageModule {}
