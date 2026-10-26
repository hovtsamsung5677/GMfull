import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  FileStorageProvider,
  FileStorageProviderInstance,
  StoreFileInput,
  StoredFile,
} from './file-storage.interface';

@Injectable()
export class LocalFileStorageProvider implements FileStorageProviderInstance {
  private readonly logger = new Logger(LocalFileStorageProvider.name);
  private readonly uploadsDir: string;

  constructor(private readonly configService: ConfigService) {
    const base = this.configService.get<string>('UPLOADS_DIR');
    this.uploadsDir = base ? join(process.cwd(), base) : join(process.cwd(), 'public', 'uploads');
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async store(input: StoreFileInput): Promise<StoredFile> {
    const safeName = this.sanitize(input.originalName);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${this.ext(safeName)}`;
    const fullPath = join(this.uploadsDir, filename);
    writeFileSync(fullPath, input.buffer);

    const base = this.configService.get<string>('UPLOADS_PATH_PREFIX');
    const urlPrefix = base ?? '/uploads';

    return {
      filename,
      url: `${urlPrefix}/${filename}`,
      path: filename,
      size: input.size,
      mimeType: input.mimeType,
      provider: FileStorageProvider.LOCAL,
    };
  }

  async delete(stored: StoredFile): Promise<void> {
    try {
      const fullPath = join(this.uploadsDir, stored.filename);
      if (existsSync(fullPath)) {
        // Filesystem deletion is best-effort for an MVP local provider.
        const { unlinkSync } = await import('fs');
        unlinkSync(fullPath);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to delete local file ${stored.filename}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private sanitize(original: string): string {
    return original
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-128)
      .toLowerCase();
  }

  private ext(sanitized: string): string {
    const lastDot = sanitized.lastIndexOf('.');
    if (lastDot <= 0) {
      return '';
    }

    return sanitized.slice(lastDot);
  }
}
