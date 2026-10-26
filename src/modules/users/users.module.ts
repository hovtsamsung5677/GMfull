import { Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DatabaseModule } from '../../database/database.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
