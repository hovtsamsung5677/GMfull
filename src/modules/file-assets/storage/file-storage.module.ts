import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FileStorageProvider,
  FileStorageProviderInstance,
  FILE_STORAGE_PROVIDER,
} from './file-storage.interface';
import { LocalFileStorageProvider } from './local-file-storage.provider';
import { S3FileStorageProvider } from './s3-file-storage.provider';

export const fileStorageProviderFactory: FactoryProvider<FileStorageProviderInstance> = {
  provide: FILE_STORAGE_PROVIDER,
  useFactory: (configService: ConfigService): FileStorageProviderInstance => {
    const provider =
      (configService.get<string>('FILE_STORAGE_PROVIDER')?.toUpperCase() as
        FileStorageProvider | undefined) ?? FileStorageProvider.LOCAL;

    if (provider === FileStorageProvider.S3) {
      return new S3FileStorageProvider(configService);
    }

    return new LocalFileStorageProvider(configService);
  },
  inject: [ConfigService],
};
