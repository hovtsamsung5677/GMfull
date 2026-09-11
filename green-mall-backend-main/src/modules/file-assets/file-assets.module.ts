import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { FileAssetsAdminController } from './file-assets-admin.controller';
import { FileAssetsPublicController } from './file-assets-public.controller';
import { FileAssetsService } from './file-assets.service';
import { MulterModule } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const uploadsDir = join(process.cwd(), 'public', 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

@Module({
  imports: [
    DatabaseModule,
    MulterModule.register({
      dest: uploadsDir,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  ],
  controllers: [FileAssetsPublicController, FileAssetsAdminController],
  providers: [FileAssetsService],
})
export class FileAssetsModule {}
