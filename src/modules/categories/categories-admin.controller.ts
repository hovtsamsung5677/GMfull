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
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CategoriesService } from './categories.service';
import { CategoryQueryDto } from './dto/category-query.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('admin/categories')
@ApiBearerAuth()
@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'MALL_ADMIN', 'CONTENT_MANAGER')
export class CategoriesAdminController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'List all categories, including inactive categories.',
  })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  findAll(@Query() query: CategoryQueryDto): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one category for administration.' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findAdminOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a category with a unique slug.' })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  @ApiConflictResponse({ description: 'Category slug already exists.' })
  create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category content and visibility.' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiConflictResponse({ description: 'Category slug already exists.' })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-disable a category using isActive=false.' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  remove(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.remove(id);
  }
}
