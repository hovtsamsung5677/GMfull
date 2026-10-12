import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";

export class PublicMapSceneQueryDto {
  @ApiPropertyOptional({
    description:
      "Optional floor id. If omitted, the first active floor is returned.",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsOptional()
  @IsString()
  floorId?: string;
}
