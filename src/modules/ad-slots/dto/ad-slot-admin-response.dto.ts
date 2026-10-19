import { ApiProperty } from "@nestjs/swagger";
import { AdPlacement } from "@prisma/client";

export class AdSlotAdminPanelResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class AdSlotAdminUserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;
}

export class AdSlotAdminResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ enum: AdPlacement, enumName: "AdPlacement" })
  placement!: AdPlacement;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Null means this is a global slot.",
  })
  panelId!: string | null;

  @ApiProperty({ minimum: 0, maximum: 1_000_000 })
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: Object, nullable: true })
  metadata!: unknown | null;

  @ApiProperty({ type: String, format: "date-time", nullable: true })
  deletedAt!: Date | null;

  @ApiProperty({ type: String, nullable: true })
  createdById!: string | null;

  @ApiProperty({ type: String, nullable: true })
  updatedById!: string | null;

  @ApiProperty({
    type: () => AdSlotAdminPanelResponseDto,
    nullable: true,
  })
  panel!: AdSlotAdminPanelResponseDto | null;

  @ApiProperty({
    type: () => AdSlotAdminUserResponseDto,
    nullable: true,
  })
  createdBy!: AdSlotAdminUserResponseDto | null;

  @ApiProperty({
    type: () => AdSlotAdminUserResponseDto,
    nullable: true,
  })
  updatedBy!: AdSlotAdminUserResponseDto | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

export class AdSlotPaginationMetaDto {
  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  limit!: number;

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 0 })
  totalPages!: number;
}

export class AdSlotAdminListResponseDto {
  @ApiProperty({ type: [AdSlotAdminResponseDto] })
  items!: AdSlotAdminResponseDto[];

  @ApiProperty({ type: AdSlotPaginationMetaDto })
  pagination!: AdSlotPaginationMetaDto;
}
