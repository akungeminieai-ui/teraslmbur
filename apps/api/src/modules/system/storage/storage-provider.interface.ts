export interface StorageProvider {
  upload(key: string, file: Buffer, mimeType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<boolean>;
  copy(sourceKey: string, destKey: string): Promise<boolean>;
  move(sourceKey: string, destKey: string): Promise<boolean>;
  temporaryUrl(key: string, expiresSeconds: number): Promise<string>;
  exists(key: string): Promise<boolean>;
  metadata(key: string): Promise<Record<string, any>>;
}
