import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { CategoriesAdminController } from './categories-admin.controller';
import { CategoriesPublicController } from './categories-public.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CategoriesPublicController, CategoriesAdminController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
