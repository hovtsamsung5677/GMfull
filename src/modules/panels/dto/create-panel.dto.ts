import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import {
  normalizePanelCode,
  normalizePanelName,
  trimPanelString,
} from "../panel-normalization";

export class CreatePanelDto {
  @ApiProperty({
    example: "main-entrance-panel",
    minLength: 1,
    maxLength: 100,
    description:
      "Stable lowercase kebab-case identifier. Input is trimmed and converted to lowercase.",
  })
  @Transform(({ value }) =>
    typeof value === "string" ? normalizePanelCode(value) : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      "code must be lowercase kebab-case using letters, digits and hyphens",
  })
  code!: string;

  @ApiProperty({
    example: "Main entrance navigation panel",
    minLength: 1,
    maxLength: 200,
    description:
      "Human-readable name. Leading, trailing and repeated whitespace is normalized.",
  })
  @Transform(({ value }) =>
    typeof value === "string" ? normalizePanelName(value) : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Matches(/\S/, { message: "name must contain a non-whitespace character" })
  name!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 5000,
  })
  @Transform(({ value }) => trimPanelString(value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      "Existing Floor id. Required together with routeNodeId when isActive=true.",
  })
  @Transform(({ value }) => trimPanelString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  floorId?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      "Existing RouteNode id of type PANEL. Required together with floorId when isActive=true.",
  })
  @Transform(({ value }) => trimPanelString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  routeNodeId?: string | null;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
    description:
      "Panel placement/configuration data for administrative map tooling.",
  })
  @IsOptional()
  @IsObject()
  location?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    default: true,
    description:
      "An active Panel must have a valid same-floor Floor and PANEL RouteNode configuration.",
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
