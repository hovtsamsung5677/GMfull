import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { HeaderBannersAdminController } from './header-banners-admin.controller';
import { HeaderBannersPublicController } from './header-banners-public.controller';
import { HeaderBannersService } from './header-banners.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HeaderBannersAdminController, HeaderBannersPublicController],
  providers: [HeaderBannersService],
  exports: [HeaderBannersService],
})
export class HeaderBannersModule {}
