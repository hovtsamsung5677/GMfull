import { ApiProperty } from "@nestjs/swagger";
import { PanelStatus, RouteNodeType } from "@prisma/client";

export class PanelAdminFloorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  number!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  isActive!: boolean;
}

export class PanelAdminRouteNodeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  floorId!: string;

  @ApiProperty({ enum: RouteNodeType, enumName: "RouteNodeType" })
  type!: RouteNodeType;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({ type: String, nullable: true })
  code!: string | null;

  @ApiProperty()
  x!: number;

  @ApiProperty()
  y!: number;

  @ApiProperty({ type: Number, nullable: true })
  z!: number | null;

  @ApiProperty()
  isActive!: boolean;
}

export class PanelAdminResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ enum: PanelStatus, enumName: "PanelStatus" })
  status!: PanelStatus;

  @ApiProperty({ type: String, nullable: true })
  floorId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  routeNodeId!: string | null;

  @ApiProperty({ type: Object, nullable: true })
  location!: unknown | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      "Runtime-reported application version. Read-only in this admin configuration API.",
  })
  appVersion!: string | null;

  @ApiProperty({
    type: String,
    format: "date-time",
    nullable: true,
    description:
      "Runtime heartbeat timestamp. Read-only in this admin configuration API.",
  })
  lastSeenAt!: Date | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({
    type: () => PanelAdminFloorResponseDto,
    nullable: true,
  })
  floor!: PanelAdminFloorResponseDto | null;

  @ApiProperty({
    type: () => PanelAdminRouteNodeResponseDto,
    nullable: true,
  })
  routeNode!: PanelAdminRouteNodeResponseDto | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;

  @ApiProperty({ type: String, format: "date-time" })
  updatedAt!: Date;
}

export class PanelPaginationMetaDto {
  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  limit!: number;

  @ApiProperty({ minimum: 0 })
  total!: number;

  @ApiProperty({ minimum: 0 })
  totalPages!: number;
}

export class PanelAdminListResponseDto {
  @ApiProperty({ type: [PanelAdminResponseDto] })
  items!: PanelAdminResponseDto[];

  @ApiProperty({ type: PanelPaginationMetaDto })
  pagination!: PanelPaginationMetaDto;
}
