import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RouteNodeType } from "@prisma/client";

class RouteNodeFloorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  number!: number;

  @ApiProperty()
  name!: string;
}

export class RouteNodeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  floorId!: string;

  @ApiProperty({ enum: RouteNodeType })
  type!: RouteNodeType;

  @ApiPropertyOptional({ nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ nullable: true })
  code!: string | null;

  @ApiProperty()
  x!: number;

  @ApiProperty()
  y!: number;

  @ApiPropertyOptional({ nullable: true })
  z!: number | null;

  @ApiPropertyOptional({ nullable: true })
  rotationX!: number | null;

  @ApiPropertyOptional({ nullable: true })
  rotationY!: number | null;

  @ApiPropertyOptional({ nullable: true })
  rotationZ!: number | null;

  @ApiPropertyOptional({ nullable: true })
  scaleX!: number | null;

  @ApiPropertyOptional({ nullable: true })
  scaleY!: number | null;

  @ApiPropertyOptional({ nullable: true })
  scaleZ!: number | null;

  @ApiPropertyOptional({ nullable: true })
  mapObjectId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Object })
  metadata!: unknown | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional({ type: RouteNodeFloorResponseDto })
  floor?: RouteNodeFloorResponseDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
