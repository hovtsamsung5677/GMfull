import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AdPlacement, Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { runSerializableTransaction } from "../../database/serializable-transaction";
import {
  adCampaignAssignmentAdminInclude,
  toAdCampaignAssignmentAdminResponse,
} from "./ad-campaign-assignment-admin.projection";
import {
  AdCampaignAssignmentAdminListResponseDto,
  AdCampaignAssignmentAdminResponseDto,
} from "./dto/ad-campaign-assignment-admin-response.dto";
import { AdCampaignAssignmentQueryDto } from "./dto/ad-campaign-assignment-query.dto";
import { CreateAdCampaignAssignmentDto } from "./dto/create-ad-campaign-assignment.dto";
import { UpdateAdCampaignAssignmentDto } from "./dto/update-ad-campaign-assignment.dto";

interface AssignmentCampaignState {
  id: string;
  placement: AdPlacement;
  isActive: boolean;
  deletedAt: Date | null;
  endsAt: Date | null;
}

interface AssignmentSlotState {
  id: string;
  placement: AdPlacement;
  isActive: boolean;
  deletedAt: Date | null;
}

@Injectable()
export class AdCampaignAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: AdCampaignAssignmentQueryDto,
  ): Promise<AdCampaignAssignmentAdminListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.AdCampaignAssignmentWhereInput = {
      deletedAt: null,
      campaignId: query.campaignId,
      slotId: query.slotId,
      isActive: query.isActive,
    };

    const [assignments, total] = await this.prisma.$transaction([
      this.prisma.adCampaignAssignment.findMany({
        where,
        include: adCampaignAssignmentAdminInclude,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.adCampaignAssignment.count({ where }),
    ]);

    return {
      items: assignments.map(toAdCampaignAssignmentAdminResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<AdCampaignAssignmentAdminResponseDto> {
    const assignment = await this.prisma.adCampaignAssignment.findFirst({
      where: { id, deletedAt: null },
      include: adCampaignAssignmentAdminInclude,
    });

    if (!assignment) {
      throw new NotFoundException("Ad campaign assignment not found");
    }

    return toAdCampaignAssignmentAdminResponse(assignment);
  }

  async create(
    dto: CreateAdCampaignAssignmentDto,
    userId: string,
  ): Promise<AdCampaignAssignmentAdminResponseDto> {
    try {
      return await runSerializableTransaction(this.prisma, async (tx) => {
        const isActive = dto.isActive ?? true;
        await this.validateReferences(tx, dto.campaignId, dto.slotId, isActive);

        const existing = await tx.adCampaignAssignment.findUnique({
          where: {
            campaignId_slotId: {
              campaignId: dto.campaignId,
              slotId: dto.slotId,
            },
          },
        });

        if (existing?.deletedAt === null) {
          throw new ConflictException("Ad campaign assignment already exists");
        }

        const assignment = existing
          ? await tx.adCampaignAssignment.update({
              where: { id: existing.id },
              data: {
                isActive,
                deletedAt: null,
                updatedById: userId,
              },
              include: adCampaignAssignmentAdminInclude,
            })
          : await tx.adCampaignAssignment.create({
              data: {
                campaignId: dto.campaignId,
                slotId: dto.slotId,
                isActive,
                createdById: userId,
                updatedById: userId,
              },
              include: adCampaignAssignmentAdminInclude,
            });

        return toAdCampaignAssignmentAdminResponse(assignment);
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: string,
    dto: UpdateAdCampaignAssignmentDto,
    userId: string,
  ): Promise<AdCampaignAssignmentAdminResponseDto> {
    try {
      if (dto.isActive) {
        return await runSerializableTransaction(this.prisma, async (tx) => {
          const existing = await tx.adCampaignAssignment.findFirst({
            where: { id, deletedAt: null },
          });

          if (!existing) {
            throw new NotFoundException("Ad campaign assignment not found");
          }

          await this.validateReferences(
            tx,
            existing.campaignId,
            existing.slotId,
            true,
          );

          const assignment = await tx.adCampaignAssignment.update({
            where: { id, deletedAt: null },
            data: {
              isActive: true,
              updatedById: userId,
            },
            include: adCampaignAssignmentAdminInclude,
          });

          return toAdCampaignAssignmentAdminResponse(assignment);
        });
      }

      const assignment = await this.prisma.adCampaignAssignment.update({
        where: { id, deletedAt: null },
        data: {
          isActive: false,
          updatedById: userId,
        },
        include: adCampaignAssignmentAdminInclude,
      });

      return toAdCampaignAssignmentAdminResponse(assignment);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(
    id: string,
    userId: string,
  ): Promise<AdCampaignAssignmentAdminResponseDto> {
    const result = await this.prisma.adCampaignAssignment.updateMany({
      where: { id, deletedAt: null },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedById: userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException("Ad campaign assignment not found");
    }

    const assignment = await this.prisma.adCampaignAssignment.findUnique({
      where: { id },
      include: adCampaignAssignmentAdminInclude,
    });

    if (!assignment) {
      throw new NotFoundException("Ad campaign assignment not found");
    }

    return toAdCampaignAssignmentAdminResponse(assignment);
  }

  private async validateReferences(
    tx: Prisma.TransactionClient,
    campaignId: string,
    slotId: string,
    isActive: boolean,
  ): Promise<void> {
    const campaign = await tx.adCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        placement: true,
        isActive: true,
        deletedAt: true,
        endsAt: true,
      },
    });
    this.ensureCampaignAvailable(campaign);

    const slot = await tx.adSlot.findUnique({
      where: { id: slotId },
      select: {
        id: true,
        placement: true,
        isActive: true,
        deletedAt: true,
      },
    });
    this.ensureSlotAvailable(slot);

    if (campaign.placement !== slot.placement) {
      throw new ConflictException(
        "Ad campaign and ad slot placements must match",
      );
    }

    if (!isActive) {
      return;
    }

    if (!campaign.isActive) {
      throw new ConflictException(
        "Active assignment requires an active ad campaign",
      );
    }

    if (!slot.isActive) {
      throw new ConflictException(
        "Active assignment requires an active ad slot",
      );
    }

    if (campaign.endsAt !== null && campaign.endsAt <= new Date()) {
      throw new ConflictException(
        "Expired ad campaign cannot have an active assignment",
      );
    }
  }

  private ensureCampaignAvailable(
    campaign: AssignmentCampaignState | null,
  ): asserts campaign is AssignmentCampaignState {
    if (!campaign || campaign.deletedAt !== null) {
      throw new NotFoundException("Ad campaign not found");
    }
  }

  private ensureSlotAvailable(
    slot: AssignmentSlotState | null,
  ): asserts slot is AssignmentSlotState {
    if (!slot || slot.deletedAt !== null) {
      throw new NotFoundException("Ad slot not found");
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ConflictException("Ad campaign assignment already exists");
      }

      if (error.code === "P2003") {
        throw new NotFoundException(
          "Referenced ad campaign, ad slot or audit user not found",
        );
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Ad campaign assignment not found");
      }
    }

    throw error;
  }
}
