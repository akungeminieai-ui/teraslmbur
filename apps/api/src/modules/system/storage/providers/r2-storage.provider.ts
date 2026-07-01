import { Injectable, Logger } from '@nestjs/common';
import { StorageProvider } from '../storage-provider.interface';

@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly logger = new Logger(R2StorageProvider.name);

  async upload(key: string, file: Buffer, mimeType: string): Promise<string> {
    this.logger.log(`☁️ [Cloudflare R2] Uploading key: ${key} (${file.length} bytes, Type: ${mimeType})`);
    return `https://cdn.teraslmbur.com/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    this.logger.log(`☁️ [Cloudflare R2] Downloading key: ${key}`);
    return Buffer.from('mock-file-content');
  }

  async delete(key: string): Promise<boolean> {
    this.logger.log(`☁️ [Cloudflare R2] Deleting key: ${key}`);
    return true;
  }

  async copy(sourceKey: string, destKey: string): Promise<boolean> {
    this.logger.log(`☁️ [Cloudflare R2] Copying key: ${sourceKey} -> ${destKey}`);
    return true;
  }

  async move(sourceKey: string, destKey: string): Promise<boolean> {
    this.logger.log(`☁️ [Cloudflare R2] Moving key: ${sourceKey} -> ${destKey}`);
    return true;
  }

  async temporaryUrl(key: string, expiresSeconds: number): Promise<string> {
    this.logger.log(`☁️ [Cloudflare R2] Generating temporary URL for key: ${key} (Expires in ${expiresSeconds}s)`);
    return `https://cdn.teraslmbur.com/${key}?token=mock-presigned-token&expires=${expiresSeconds}`;
  }

  async exists(key: string): Promise<boolean> {
    this.logger.log(`☁️ [Cloudflare R2] Checking existence of key: ${key}`);
    return true;
  }

  async metadata(key: string): Promise<Record<string, any>> {
    this.logger.log(`☁️ [Cloudflare R2] Retrieving metadata for key: ${key}`);
    return {
      key,
      size: 1024,
      mimeType: 'image/png',
      lastModified: new Date(),
    };
  }
}
