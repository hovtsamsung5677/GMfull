import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PanelPublicResponseDto {
  @ApiProperty({ description: "Panel identifier used for analytics attribution." })
  id!: string;

  @ApiProperty({ description: "Stable panel code." })
  code!: string;

  @ApiProperty({ description: "Panel display name." })
  name!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: "Identifier of the Floor the panel is installed on.",
  })
  floorId!: string | null;
}
