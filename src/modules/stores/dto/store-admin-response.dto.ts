import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { StoreResponseDto } from "./store-response.dto";

export class StoreAdminResponseDto extends StoreResponseDto {
  @ApiPropertyOptional({ nullable: true })
  tenantId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  categoryId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  floorId!: string | null;

  @ApiProperty({
    type: [String],
    description: "MapObject ids currently linked to this store.",
  })
  mapObjectIds!: string[];

  @ApiProperty({
    type: [String],
    description:
      "RouteNode ids linked through the store map objects. This is a derived relation.",
  })
  routeNodeIds!: string[];

  @ApiPropertyOptional({
    nullable: true,
    description: "Preferred map object for map focus and highlighting.",
  })
  primaryMapObjectId!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: "Preferred STORE_ANCHOR route node for navigation.",
  })
  primaryRouteNodeId!: string | null;
}
