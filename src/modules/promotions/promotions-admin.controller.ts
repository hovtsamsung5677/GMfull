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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { PromotionAdminResponseDto } from './dto/promotion-admin-response.dto';
import { PromotionQueryDto } from './dto/promotion-query.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionsService } from './promotions.service';

@ApiTags('admin/promotions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'JWT access token is missing or invalid.',
})
@ApiForbiddenResponse({ description: 'The authenticated role is not allowed.' })
@Controller('admin/promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromotionsAdminController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @Roles(
    'SUPER_ADMIN',
    'MALL_ADMIN',
    'CONTENT_MANAGER',
    'ADS_MANAGER',
    'ANALYTICS_VIEWER',
  )
  @ApiOperation({
    summary: 'List non-deleted promotions',
    description:
      'Returns admin promotion records. Soft-deleted records are excluded by default.',
  })
  @ApiOkResponse({ type: [PromotionAdminResponseDto] })
  @ApiBadRequestResponse({ description: 'Invalid filter or pagination value.' })
  findAll(
    @Query() query: PromotionQueryDto,
  ): Promise<PromotionAdminResponseDto[]> {
    return this.promotionsService.findAll(query);
  }

  @Get(':id')
  @Roles(
    'SUPER_ADMIN',
    'MALL_ADMIN',
    'CONTENT_MANAGER',
    'ADS_MANAGER',
    'ANALYTICS_VIEWER',
  )
  @ApiOperation({ summary: 'Get one non-deleted promotion by id' })
  @ApiParam({ name: 'id', description: 'Promotion cuid.' })
  @ApiOkResponse({ type: PromotionAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Promotion not found or soft-deleted.' })
  findOne(@Param('id') id: string): Promise<PromotionAdminResponseDto> {
    return this.promotionsService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'MALL_ADMIN', 'CONTENT_MANAGER', 'ADS_MANAGER')
  @ApiOperation({
    summary: 'Create a promotion',
    description:
      'Registers promotion content and records createdById/updatedById from the authenticated JWT user.',
  })
  @ApiCreatedResponse({ type: PromotionAdminResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid dates, mismatched tenant/store, inactive publication target or invalid image kind.',
  })
  @ApiNotFoundResponse({
    description: 'Referenced store, tenant or image asset was not found.',
  })
  @ApiConflictResponse({ description: 'Promotion slug already exists.' })
  create(
    @Body() dto: CreatePromotionDto,
    @CurrentUser('id') userId: string,
  ): Promise<PromotionAdminResponseDto> {
    return this.promotionsService.create(dto, userId);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'MALL_ADMIN', 'CONTENT_MANAGER', 'ADS_MANAGER')
  @ApiOperation({
    summary: 'Update a non-deleted promotion',
    description:
      'Revalidates the effective store, tenant, image and date range and records updatedById from JWT.',
  })
  @ApiParam({ name: 'id', description: 'Promotion cuid.' })
  @ApiOkResponse({ type: PromotionAdminResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid dates, mismatched tenant/store, inactive publication target or invalid image kind.',
  })
  @ApiNotFoundResponse({
    description:
      'Promotion is missing/soft-deleted or a referenced entity was not found.',
  })
  @ApiConflictResponse({ description: 'Promotion slug already exists.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
    @CurrentUser('id') userId: string,
  ): Promise<PromotionAdminResponseDto> {
    return this.promotionsService.update(id, dto, userId);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'MALL_ADMIN', 'CONTENT_MANAGER', 'ADS_MANAGER')
  @ApiOperation({
    summary: 'Soft-delete a promotion',
    description:
      'Sets deletedAt and isActive=false. No Promotion row is physically deleted.',
  })
  @ApiParam({ name: 'id', description: 'Promotion cuid.' })
  @ApiOkResponse({ type: PromotionAdminResponseDto })
  @ApiNotFoundResponse({
    description: 'Promotion not found or already deleted.',
  })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<PromotionAdminResponseDto> {
    return this.promotionsService.remove(id, userId);
  }
}
