import { PartialType } from "@nestjs/swagger";
import { CreateRouteNodeDto } from "./create-route-node.dto";

export class UpdateRouteNodeDto extends PartialType(CreateRouteNodeDto) {}
