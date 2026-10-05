import { PartialType } from "@nestjs/swagger";
import { CreateRouteEdgeDto } from "./create-route-edge.dto";

export class UpdateRouteEdgeDto extends PartialType(CreateRouteEdgeDto, {
  skipNullProperties: false,
}) {}
