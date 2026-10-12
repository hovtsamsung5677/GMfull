import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";

const trimString = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class BuildRouteToStoreQueryDto {
  @ApiProperty({
    description: "Start route node id.",
    example: "cmrdinirk0001w3awtdjmkjyg",
  })
  @Transform(trimString)
  @IsString()
  fromNodeId!: string;

  @ApiPropertyOptional({
    description:
      "Target store id. Provide one of storeId, storeSlug, storeCode.",
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({
    description:
      "Target store slug. Provide one of storeId, storeSlug, storeCode.",
    example: "sportmaster",
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  storeSlug?: string;

  @ApiPropertyOptional({
    description:
      "Target store code. Since Store has no code field, backend resolves it by store slug or linked route node code.",
    example: "STORE_SPORTMASTER",
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  storeCode?: string;

  @ApiPropertyOptional({
    description:
      "Optional floor id. If provided, route is built only on this floor.",
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  floorId?: string;
}
