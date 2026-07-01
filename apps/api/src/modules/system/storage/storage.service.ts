import { Injectable, Logger } from '@nestjs/common';
import { R2StorageProvider } from './providers/r2-storage.provider';
import { SettingsService } from '../settings/settings.service';
import { StorageProvider } from './storage-provider.interface';

@Injectable()
export class StorageService implements StorageProvider {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly r2Provider: R2StorageProvider,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Resolves the active StorageProvider driver based on database configurations.
   */
  private async getProvider(): Promise<StorageProvider> {
    let driver = 'R2';
    try {
      driver = await this.settingsService.get('storage_provider_driver');
    } catch (e) {
      // Fallback
    }

    if (driver === 'R2' || !driver) {
      return this.r2Provider;
    }

    this.logger.warn(`⚠️ Configured storage driver '${driver}' not fully mapped. Defaulting to Cloudflare R2.`);
    return this.r2Provider;
  }

  async upload(key: string, file: Buffer, mimeType: string): Promise<string> {
    const provider = await this.getProvider();
    return provider.upload(key, file, mimeType);
  }

  async download(key: string): Promise<Buffer> {
    const provider = await this.getProvider();
    return provider.download(key);
  }

  async delete(key: string): Promise<boolean> {
    const provider = await this.getProvider();
    return provider.delete(key);
  }

  async copy(sourceKey: string, destKey: string): Promise<boolean> {
    const provider = await this.getProvider();
    return provider.copy(sourceKey, destKey);
  }

  async move(sourceKey: string, destKey: string): Promise<boolean> {
    const provider = await this.getProvider();
    return provider.move(sourceKey, destKey);
  }

  async temporaryUrl(key: string, expiresSeconds: number): Promise<string> {
    const provider = await this.getProvider();
    return provider.temporaryUrl(key, expiresSeconds);
  }

  async exists(key: string): Promise<boolean> {
    const provider = await this.getProvider();
    return provider.exists(key);
  }

  async metadata(key: string): Promise<Record<string, any>> {
    const provider = await this.getProvider();
    return provider.metadata(key);
  }
}
