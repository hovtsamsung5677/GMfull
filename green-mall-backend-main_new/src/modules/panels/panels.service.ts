import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Panel, Prisma, RouteNodeType } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { runSerializableTransaction } from "../../database/serializable-transaction";
import {
  PanelAdminListResponseDto,
  PanelAdminResponseDto,
} from "./dto/panel-admin-response.dto";
import { PanelPublicResponseDto } from "./dto/panel-public-response.dto";
import { PanelQueryDto } from "./dto/panel-query.dto";
import { CreatePanelDto } from "./dto/create-panel.dto";
import { UpdatePanelDto } from "./dto/update-panel.dto";
import {
  panelAdminInclude,
  toPanelAdminResponse,
} from "./panel-admin.projection";
import { normalizePanelCode, normalizePanelName } from "./panel-normalization";

interface PanelValidationState {
  code: string;
  name: string;
  description: string | null;
  floorId: string | null;
  routeNodeId: string | null;
  isActive: boolean;
}

type PanelWriteClient = Pick<
  Prisma.TransactionClient,
  "panel" | "floor" | "routeNode"
>;

@Injectable()
export class PanelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PanelQueryDto): Promise<PanelAdminListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);

    const [panels, total] = await this.prisma.$transaction([
      this.prisma.panel.findMany({
        where,
        include: panelAdminInclude,
        orderBy: [{ name: "asc" }, { code: "asc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.panel.count({ where }),
    ]);

    return {
      items: panels.map(toPanelAdminResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<PanelAdminResponseDto> {
    const panel = await this.prisma.panel.findUnique({
      where: { id },
      include: panelAdminInclude,
    });
    if (!panel) {
      throw new NotFoundException("Panel not found");
    }

    return toPanelAdminResponse(panel);
  }

  async findPublicByRouteNodeId(
    routeNodeId: string,
  ): Promise<PanelPublicResponseDto> {
    const panel = await this.prisma.panel.findUnique({
      where: { routeNodeId },
      select: {
        id: true,
        code: true,
        name: true,
        floorId: true,
      },
    });

    if (!panel) {
      throw new NotFoundException("Panel not found for route node");
    }

    return panel;
  }

  async create(dto: CreatePanelDto): Promise<PanelAdminResponseDto> {
    const state: PanelValidationState = {
      code: normalizePanelCode(dto.code),
      name: normalizePanelName(dto.name),
      description: this.normalizeNullableText(dto.description) ?? null,
      floorId: dto.floorId ?? null,
      routeNodeId: dto.routeNodeId ?? null,
      isActive: dto.isActive ?? true,
    };

    try {
      return await runSerializableTransaction(this.prisma, async (tx) => {
        await this.validateState(state, tx);
        await this.ensureCodeAvailable(state.code, undefined, tx);
        await this.ensureRouteNodeAvailable(state.routeNodeId, undefined, tx);

        const panel = await tx.panel.create({
          data: {
            ...state,
            location: this.toJsonInput(dto.location),
          },
          include: panelAdminInclude,
        });

        return toPanelAdminResponse(panel);
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdatePanelDto,
  ): Promise<PanelAdminResponseDto> {
    try {
      return await runSerializableTransaction(this.prisma, async (tx) => {
        const existing = await this.findExisting(id, tx);
        const state: PanelValidationState = {
          code:
            dto.code === undefined
              ? existing.code
              : normalizePanelCode(dto.code),
          name:
            dto.name === undefined
              ? existing.name
              : normalizePanelName(dto.name),
          description:
            dto.description === undefined
              ? existing.description
              : (this.normalizeNullableText(dto.description) ?? null),
          floorId: dto.floorId === undefined ? existing.floorId : dto.floorId,
          routeNodeId:
            dto.routeNodeId === undefined
              ? existing.routeNodeId
              : dto.routeNodeId,
          isActive:
            dto.isActive === undefined ? existing.isActive : dto.isActive,
        };

        await this.validateState(state, tx);
        await this.ensureCodeAvailable(state.code, existing.id, tx);
        await this.ensureRouteNodeAvailable(state.routeNodeId, existing.id, tx);

        const panel = await tx.panel.update({
          where: { id: existing.id },
          data: {
            ...state,
            location: this.toJsonInput(dto.location),
          },
          include: panelAdminInclude,
        });

        return toPanelAdminResponse(panel);
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string): Promise<PanelAdminResponseDto> {
    const existing = await this.prisma.panel.findUnique({
      where: { id },
      include: panelAdminInclude,
    });

    if (!existing) {
      throw new NotFoundException("Panel not found");
    }

    if (!existing.isActive) {
      return toPanelAdminResponse(existing);
    }

    try {
      const panel = await this.prisma.panel.update({
        where: { id },
        data: { isActive: false },
        include: panelAdminInclude,
      });

      return toPanelAdminResponse(panel);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private buildWhere(query: PanelQueryDto): Prisma.PanelWhereInput {
    const search = query.search?.trim();

    return {
      floorId: query.floorId,
      status: query.status,
      isActive: query.isActive,
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
  }

  private async findExisting(
    id: string,
    db: PanelWriteClient = this.prisma,
  ): Promise<Panel> {
    const panel = await db.panel.findUnique({ where: { id } });

    if (!panel) {
      throw new NotFoundException("Panel not found");
    }

    return panel;
  }

  private async validateState(
    state: PanelValidationState,
    db: PanelWriteClient = this.prisma,
  ): Promise<void> {
    if (
      state.code.length === 0 ||
      state.code.length > 100 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(state.code)
    ) {
      throw new BadRequestException(
        "code must be lowercase kebab-case using letters, digits and hyphens",
      );
    }

    if (
      state.name.length === 0 ||
      state.name.length > 200 ||
      !/\S/.test(state.name)
    ) {
      throw new BadRequestException(
        "name must contain between 1 and 200 non-whitespace characters",
      );
    }

    if (state.description !== null && state.description.length > 5000) {
      throw new BadRequestException(
        "description must not exceed 5000 characters",
      );
    }

    if (state.isActive && (!state.floorId || !state.routeNodeId)) {
      throw new BadRequestException(
        "Active panel requires floorId and routeNodeId",
      );
    }

    const [floor, routeNode] = await Promise.all([
      state.floorId === null
        ? Promise.resolve(null)
        : db.floor.findUnique({
            where: { id: state.floorId },
            select: { id: true },
          }),
      state.routeNodeId === null
        ? Promise.resolve(null)
        : db.routeNode.findUnique({
            where: { id: state.routeNodeId },
            select: { id: true, floorId: true, type: true },
          }),
    ]);

    if (state.floorId !== null && !floor) {
      throw new NotFoundException("Floor not found");
    }

    if (state.routeNodeId !== null && !routeNode) {
      throw new NotFoundException("Route node not found");
    }

    if (routeNode && routeNode.type !== RouteNodeType.PANEL) {
      throw new BadRequestException("Route node type must be PANEL");
    }

    if (
      state.floorId !== null &&
      routeNode &&
      routeNode.floorId !== state.floorId
    ) {
      throw new BadRequestException(
        "Panel floorId must match route node floorId",
      );
    }
  }

  private async ensureCodeAvailable(
    code: string,
    currentId?: string,
    db: PanelWriteClient = this.prisma,
  ): Promise<void> {
    const existing = await db.panel.findUnique({
      where: { code },
      select: { id: true },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException("Panel code already exists");
    }
  }

  private async ensureRouteNodeAvailable(
    routeNodeId: string | null,
    currentId?: string,
    db: PanelWriteClient = this.prisma,
  ): Promise<void> {
    if (routeNodeId === null) {
      return;
    }

    const existing = await db.panel.findUnique({
      where: { routeNodeId },
      select: { id: true },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException("Route node is already assigned to a Panel");
    }
  }

  private normalizeNullableText(
    value: string | null | undefined,
  ): string | null | undefined {
    if (value === undefined || value === null) {
      return value;
    }

    return value.trim();
  }

  private toJsonInput(
    value: Record<string, unknown> | null | undefined,
  ): Prisma.InputJsonValue | Prisma.NullTypes.DbNull | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.DbNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.map(String)
          : [String(error.meta?.target ?? "")];

        if (target.some((field) => field.includes("routeNodeId"))) {
          throw new ConflictException(
            "Route node is already assigned to a Panel",
          );
        }

        throw new ConflictException("Panel code already exists");
      }

      if (error.code === "P2003") {
        const details = JSON.stringify(error.meta ?? {});

        if (details.includes("routeNodeId")) {
          throw new NotFoundException("Route node not found");
        }

        if (details.includes("floorId")) {
          throw new NotFoundException("Floor not found");
        }

        throw new NotFoundException("Referenced Floor or Route node not found");
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Panel not found");
      }
    }

    throw error;
  }
}
