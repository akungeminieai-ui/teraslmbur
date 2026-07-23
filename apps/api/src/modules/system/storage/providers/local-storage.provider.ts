import { Injectable, Logger } from '@nestjs/common';
import { StorageProvider } from '../storage-provider.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadDir: string;

  constructor() {
    // Resolve upload directory dynamically
    const relativeWebPath = path.resolve(process.cwd(), '../web/public/uploads');
    const webPublicDir = path.resolve(process.cwd(), '../web/public');
    
    if (fs.existsSync(webPublicDir)) {
      this.uploadDir = relativeWebPath;
    } else {
      this.uploadDir = path.resolve(process.cwd(), 'public/uploads');
    }

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(key: string, file: Buffer, _mimeType: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, file);
    this.logger.log(`💾 [Local Storage] Uploaded key: ${key} to ${filePath}`);
    
    // Return relative URL for browser rendering
    return `/uploads/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(this.uploadDir, key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }
    return fs.readFileSync(filePath);
  }

  async delete(key: string): Promise<boolean> {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`💾 [Local Storage] Deleted key: ${key}`);
      return true;
    }
    return false;
  }

  async copy(sourceKey: string, destKey: string): Promise<boolean> {
    const srcPath = path.join(this.uploadDir, sourceKey);
    const destPath = path.join(this.uploadDir, destKey);
    if (fs.existsSync(srcPath)) {
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(srcPath, destPath);
      return true;
    }
    return false;
  }

  async move(sourceKey: string, destKey: string): Promise<boolean> {
    const srcPath = path.join(this.uploadDir, sourceKey);
    const destPath = path.join(this.uploadDir, destKey);
    if (fs.existsSync(srcPath)) {
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.renameSync(srcPath, destPath);
      return true;
    }
    return false;
  }

  async temporaryUrl(key: string, _expiresSeconds: number): Promise<string> {
    return `/uploads/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(this.uploadDir, key);
    return fs.existsSync(filePath);
  }

  async metadata(key: string): Promise<Record<string, any>> {
    const filePath = path.join(this.uploadDir, key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${key}`);
    }
    const stats = fs.statSync(filePath);
    return {
      key,
      size: stats.size,
      lastModified: stats.mtime,
    };
  }
}
