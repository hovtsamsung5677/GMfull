import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Upload } from '@aws-sdk/lib-storage';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import {
  FileStorageProvider,
  FileStorageProviderInstance,
  StoreFileInput,
  StoredFile,
} from './file-storage.interface';

interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  urlPrefix?: string;
}

@Injectable()
export class S3FileStorageProvider implements FileStorageProviderInstance {
  private readonly logger = new Logger(S3FileStorageProvider.name);
  private readonly config: S3Config;
  private readonly client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.config = this.resolveConfig();
    this.client = new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      forcePathStyle: this.config.forcePathStyle,
    });
  }

  async store(input: StoreFileInput): Promise<StoredFile> {
    const filename = this.buildFilename(input.originalName);
    const key = `${filename}`;

    const parallel = Math.max(
      1,
      Number(this.configService.get<string>('S3_MULTIPART_THRESHOLD') ?? '5'),
    );

    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.config.bucket,
          Key: key,
          Body: input.buffer,
          ContentType: input.mimeType,
          ContentLength: input.size,
        },
        queueSize: parallel,
        partSize: 5 * 1024 * 1024,
      });

      await upload.done();
    } catch (error) {
      this.logger.error(
        `S3 upload failed for ${input.originalName}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException('Failed to store file in S3');
    }

    return {
      filename,
      url: this.config.urlPrefix
        ? `${this.config.urlPrefix}/${key}`
        : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`,
      path: key,
      size: input.size,
      mimeType: input.mimeType,
      provider: FileStorageProvider.S3,
    };
  }

  async delete(stored: StoredFile): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: stored.path,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `S3 delete failed for ${stored.path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private resolveConfig(): S3Config {
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID') ?? '';
    const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY') ?? '';
    const bucket = this.configService.get<string>('S3_BUCKET') ?? '';
    const region = this.configService.get<string>('S3_REGION') ?? 'us-east-1';

    if (!accessKeyId || !secretAccessKey || !bucket) {
      throw new InternalServerErrorException(
        'S3 storage is enabled but S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_BUCKET are required',
      );
    }

    return {
      endpoint: this.configService.get<string>('S3_ENDPOINT') || undefined,
      region,
      bucket,
      accessKeyId,
      secretAccessKey,
      forcePathStyle: this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true',
      urlPrefix: this.configService.get<string>('S3_URL_PREFIX') || undefined,
    };
  }

  private buildFilename(original: string): string {
    const ext = this.ext(original);
    return `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  }

  private ext(original: string): string {
    const lastDot = original.lastIndexOf('.');
    if (lastDot <= 0) {
      return '';
    }

    return original.slice(lastDot).toLowerCase();
  }
}
