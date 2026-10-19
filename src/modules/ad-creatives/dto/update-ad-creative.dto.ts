import { PartialType } from "@nestjs/swagger";
import { CreateAdCreativeDto } from "./create-ad-creative.dto";

export class UpdateAdCreativeDto extends PartialType(CreateAdCreativeDto, {
  skipNullProperties: false,
}) {}
