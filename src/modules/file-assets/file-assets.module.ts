import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DatabaseModule } from '../../database/database.module';
import { FileAssetsAdminController } from './file-assets-admin.controller';
import { FileAssetsPublicController } from './file-assets-public.controller';
import { FileAssetsService } from './file-assets.service';
import { fileStorageProviderFactory } from './storage/file-storage.module';

@Module({
  imports: [
    DatabaseModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  ],
  controllers: [FileAssetsPublicController, FileAssetsAdminController],
  providers: [FileAssetsService, fileStorageProviderFactory],
})
export class FileAssetsModule {}
