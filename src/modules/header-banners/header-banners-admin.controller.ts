import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { HeaderBannersService } from './header-banners.service';
import { CreateHeaderBannerDto } from './dto/create-header-banner.dto';
import { UpdateHeaderBannerDto } from './dto/update-header-banner.dto';
import {
  HeaderBannerQueryDto,
  HeaderBannerResponseDto,
} from './dto/header-banner-query.dto';

const HEADER_BANNER_READ_ROLES = ['SUPER_ADMIN', 'MALL_ADMIN', 'ADS_MANAGER'];
const HEADER_BANNER_WRITE_ROLES = ['SUPER_ADMIN', 'MALL_ADMIN', 'ADS_MANAGER'];

@ApiTags('admin/header-banners')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'JWT access token is missing or invalid.',
})
@Controller('admin/header-banners')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HeaderBannersAdminController {
  constructor(private readonly headerBannersService: HeaderBannersService) {}

  @Get()
  @Roles(...HEADER_BANNER_READ_ROLES)
  @ApiOperation({ summary: 'List header banners' })
  @ApiOkResponse()
  findAll(
    @Query() query: HeaderBannerQueryDto,
  ): Promise<{ items: HeaderBannerResponseDto[]; total: number }> {
    return this.headerBannersService.findAll(query);
  }

  @Get(':id')
  @Roles(...HEADER_BANNER_READ_ROLES)
  @ApiOperation({ summary: 'Get one header banner' })
  @ApiOkResponse()
  findOne(@Param('id') id: string): Promise<HeaderBannerResponseDto> {
    return this.headerBannersService.findOne(id);
  }

  @Post()
  @Roles(...HEADER_BANNER_WRITE_ROLES)
  @ApiOperation({ summary: 'Create a header banner' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateHeaderBannerDto,
    @CurrentUser('id') userId: string,
  ): Promise<HeaderBannerResponseDto> {
    return this.headerBannersService.create(dto, userId);
  }

  @Patch(':id')
  @Roles(...HEADER_BANNER_WRITE_ROLES)
  @ApiOperation({ summary: 'Update a header banner' })
  @ApiOkResponse()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateHeaderBannerDto,
    @CurrentUser('id') userId: string,
  ): Promise<HeaderBannerResponseDto> {
    return this.headerBannersService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles(...HEADER_BANNER_WRITE_ROLES)
  @ApiOperation({ summary: 'Soft-delete a header banner' })
  @ApiOkResponse()
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<HeaderBannerResponseDto> {
    return this.headerBannersService.remove(id, userId);
  }
}
