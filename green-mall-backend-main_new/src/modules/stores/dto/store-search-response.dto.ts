import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class StoreSearchCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class StoreSearchResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  roomNumber!: string | null;

  @ApiPropertyOptional({ type: StoreSearchCategoryDto, nullable: true })
  category!: StoreSearchCategoryDto | null;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  primaryMapObjectId!: string | null;

  @ApiProperty({ type: [String] })
  mapObjectIds!: string[];

  @ApiPropertyOptional({ nullable: true })
  primaryRouteNodeId!: string | null;

  @ApiProperty({ type: [String] })
  routeNodeIds!: string[];

  @ApiPropertyOptional({ nullable: true })
  searchKeywords!: string | null;
}
