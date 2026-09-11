import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CategoryQueryDto } from './dto/category-query.dto';
import { CategoryResponseDto } from './dto/category-response.dto';

@ApiTags('public/categories')
@Controller('public/categories')
export class CategoriesPublicController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOkResponse({ type: [CategoryResponseDto] })
  findAll(@Query() query: CategoryQueryDto): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findPublic(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: CategoryResponseDto })
  findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findPublicOne(id);
  }
}
