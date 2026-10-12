import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { RoleResponseDto } from "./dto/role-response.dto";

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<RoleResponseDto[]> {
    return this.prisma.role.findMany({
      orderBy: { name: "asc" },
    });
  }
}
