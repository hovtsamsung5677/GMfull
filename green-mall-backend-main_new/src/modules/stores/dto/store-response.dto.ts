import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class StoreTenantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

class StoreCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

class StoreFloorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  number!: number;

  @ApiProperty()
  name!: string;
}

export class StoreResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ nullable: true })
  roomNumber!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  website!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  workingHours!: unknown | null;

  @ApiPropertyOptional({ nullable: true })
  searchKeywords!: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoAssetId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  coverAssetId!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isVisible!: boolean;

  @ApiPropertyOptional({ type: StoreTenantResponseDto, nullable: true })
  tenant!: StoreTenantResponseDto | null;

  @ApiPropertyOptional({ type: StoreCategoryResponseDto, nullable: true })
  category!: StoreCategoryResponseDto | null;

  @ApiPropertyOptional({ type: StoreFloorResponseDto, nullable: true })
  floor!: StoreFloorResponseDto | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
