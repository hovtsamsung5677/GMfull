import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AnalyticsEventType, AnalyticsSource, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CreatePublicAnalyticsEventDto } from "./dto/create-public-analytics-event.dto";
import { PublicAnalyticsEventResponseDto } from "./dto/public-analytics-event-response.dto";
import {
  PublicAnalyticsEventIdentityRecord,
  publicAnalyticsEventIdentitySelect,
  toPublicAnalyticsEventResponse,
} from "./public-analytics-event.projection";

export interface PublicAnalyticsEventTrackingResult {
  event: PublicAnalyticsEventResponseDto;
  created: boolean;
}

@Injectable()
export class PublicAnalyticsEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async track(
    dto: CreatePublicAnalyticsEventDto,
  ): Promise<PublicAnalyticsEventTrackingResult> {
    const existing = await this.findByClientEventId(dto.clientEventId);

    if (existing) {
      return this.resolveReplay(existing, dto);
    }

    this.validateEventRules(dto);

    const panelId = dto.panelId ?? null;
    const storeId = dto.storeId ?? null;
    const categoryId = dto.categoryId ?? null;
    const promotionId = dto.promotionId ?? null;
    const [panel, store, category, promotion] = await Promise.all([
      panelId === null
        ? Promise.resolve(null)
        : this.prisma.panel.findUnique({
            where: { id: panelId },
            select: { id: true },
          }),
      storeId === null
        ? Promise.resolve(null)
        : this.prisma.store.findUnique({
            where: { id: storeId },
            select: { id: true },
          }),
      categoryId === null
        ? Promise.resolve(null)
        : this.prisma.category.findUnique({
            where: { id: categoryId },
            select: { id: true },
          }),
      promotionId === null
        ? Promise.resolve(null)
        : this.prisma.promotion.findUnique({
            where: { id: promotionId },
            select: { id: true },
          }),
    ]);

    if (panelId !== null && !panel) {
      throw new NotFoundException("Panel not found");
    }

    if (storeId !== null && !store) {
      throw new NotFoundException("Store not found");
    }

    if (categoryId !== null && !category) {
      throw new NotFoundException("Category not found");
    }

    if (promotionId !== null && !promotion) {
      throw new NotFoundException("Promotion not found");
    }

    try {
      const event = await this.prisma.analyticsEvent.create({
        data: {
          clientEventId: dto.clientEventId,
          type: dto.type,
          source: dto.source,
          sessionId: dto.sessionId ?? null,
          panelId,
          storeId,
          categoryId,
          promotionId,
          query: dto.query ?? null,
          deviceData: this.toJsonInput(dto.deviceData),
          payload: this.toJsonInput(dto.payload),
        },
        select: publicAnalyticsEventIdentitySelect,
      });

      return {
        event: toPublicAnalyticsEventResponse(event),
        created: true,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const concurrent = await this.findByClientEventId(dto.clientEventId);

        if (concurrent) {
          return this.resolveReplay(concurrent, dto);
        }
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        throw new NotFoundException(
          "Referenced analytics entity no longer exists",
        );
      }

      throw error;
    }
  }

  private async findByClientEventId(
    clientEventId: string,
  ): Promise<PublicAnalyticsEventIdentityRecord | null> {
    return this.prisma.analyticsEvent.findUnique({
      where: { clientEventId },
      select: publicAnalyticsEventIdentitySelect,
    });
  }

  private resolveReplay(
    existing: PublicAnalyticsEventIdentityRecord,
    dto: CreatePublicAnalyticsEventDto,
  ): PublicAnalyticsEventTrackingResult {
    const sameIdentity =
      existing.type === dto.type &&
      existing.source === dto.source &&
      existing.sessionId === (dto.sessionId ?? null) &&
      existing.panelId === (dto.panelId ?? null) &&
      existing.storeId === (dto.storeId ?? null) &&
      existing.categoryId === (dto.categoryId ?? null) &&
      existing.promotionId === (dto.promotionId ?? null) &&
      existing.query === (dto.query ?? null) &&
      this.stableJson(existing.payload) === this.stableJson(dto.payload);

    if (!sameIdentity) {
      throw new ConflictException(
        "clientEventId is already used for a different visitor/navigation event",
      );
    }

    return {
      event: toPublicAnalyticsEventResponse(existing),
      created: false,
    };
  }

  private validateEventRules(dto: CreatePublicAnalyticsEventDto): void {
    if (
      dto.type === AnalyticsEventType.SEARCH_QUERY &&
      (dto.query === undefined || dto.query === null || dto.query.length === 0)
    ) {
      throw new BadRequestException("query is required for SEARCH_QUERY");
    }

    if (
      dto.type === AnalyticsEventType.CATEGORY_SELECTED &&
      (dto.categoryId === undefined || dto.categoryId === null)
    ) {
      throw new BadRequestException(
        "categoryId is required for CATEGORY_SELECTED",
      );
    }

    if (
      (dto.type === AnalyticsEventType.STORE_SELECTED ||
        dto.type === AnalyticsEventType.STORE_CARD_VIEWED) &&
      (dto.storeId === undefined || dto.storeId === null)
    ) {
      throw new BadRequestException(`storeId is required for ${dto.type}`);
    }

    if (
      dto.type === AnalyticsEventType.PROMOTION_VIEWED &&
      (dto.promotionId === undefined || dto.promotionId === null)
    ) {
      throw new BadRequestException(
        "promotionId is required for PROMOTION_VIEWED",
      );
    }

    if (
      (dto.type === AnalyticsEventType.SESSION_RESET ||
        dto.type === AnalyticsEventType.PANEL_USED) &&
      dto.source !== AnalyticsSource.PANEL
    ) {
      throw new BadRequestException(`${dto.type} requires PANEL source`);
    }

    if (
      dto.type === AnalyticsEventType.MOBILE_OPENED &&
      dto.source !== AnalyticsSource.MOBILE
    ) {
      throw new BadRequestException("MOBILE_OPENED requires MOBILE source");
    }
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

  private stableJson(value: unknown): string {
    if (value === undefined || value === null) {
      return "null";
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableJson(item)).join(",")}]`;
    }

    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      return `{${Object.keys(record)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${this.stableJson(record[key])}`)
        .join(",")}}`;
    }

    return JSON.stringify(value);
  }
}
