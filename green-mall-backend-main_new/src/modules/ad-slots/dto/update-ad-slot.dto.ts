import { PartialType } from "@nestjs/swagger";
import { CreateAdSlotDto } from "./create-ad-slot.dto";

export class UpdateAdSlotDto extends PartialType(CreateAdSlotDto, {
  skipNullProperties: false,
}) {}
