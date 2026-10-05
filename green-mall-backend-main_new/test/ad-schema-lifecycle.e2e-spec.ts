import {
  AdPlacement,
  AdTargetType,
  Prisma,
  PrismaClient,
} from "@prisma/client";

describe("Ad schema lifecycle constraints (e2e)", () => {
  const prisma = new PrismaClient();
  const runId = `${Date.now()}-${process.pid}`;
  const prefix = `ad-schema-e2e-${runId}`;

  let userId: string;
  let storeId: string;
  let campaignId: string;
  let panelId: string;

  const buildCampaignData = (
    overrides: Partial<Prisma.AdCampaignUncheckedCreateInput> = {},
  ): Prisma.AdCampaignUncheckedCreateInput => ({
    name: `${prefix}-campaign`,
    placement: AdPlacement.HOME_PANEL_BANNER,
    targetType: AdTargetType.STORE,
    targetStoreId: storeId,
    ...overrides,
  });

  async function expectCheckConstraintViolation(
    operation: Promise<unknown>,
    constraintName: string,
  ): Promise<void> {
    try {
      await operation;
      throw new Error(`Expected ${constraintName} to reject the operation`);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        expect(error.code).toBe("P2004");
      } else {
        expect(error).toBeInstanceOf(Prisma.PrismaClientUnknownRequestError);
        expect((error as Error).message).toContain('code: "23514"');
      }

      expect((error as Error).message).toContain(constraintName);
    }
  }

  beforeAll(async () => {
    await prisma.$connect();

    const role = await prisma.role.create({
      data: {
        name: `${prefix}-role`,
        description: "Temporary role for Ad schema lifecycle e2e tests",
      },
      select: { id: true },
    });

    const user = await prisma.user.create({
      data: {
        email: `${prefix}@greenmall.local`,
        passwordHash: "not-used-by-schema-test",
        name: "Ad Schema E2E User",
        roleId: role.id,
        isActive: true,
      },
      select: { id: true },
    });
    userId = user.id;

    const tenant = await prisma.tenant.create({
      data: {
        name: `${prefix}-tenant`,
        isActive: true,
      },
      select: { id: true },
    });

    const store = await prisma.store.create({
      data: {
        tenantId: tenant.id,
        name: `${prefix}-store`,
        slug: `${prefix}-store`,
        isActive: true,
        isVisible: true,
      },
      select: { id: true },
    });
    storeId = store.id;

    const panel = await prisma.panel.create({
      data: {
        code: `${prefix}-panel`,
        name: `${prefix}-panel`,
      },
      select: { id: true },
    });
    panelId = panel.id;
  });

  afterAll(async () => {
    try {
      await prisma.adSlot.deleteMany({
        where: { code: { startsWith: prefix } },
      });
      await prisma.adCreative.deleteMany({
        where: {
          campaign: {
            name: { startsWith: prefix },
          },
        },
      });
      await prisma.adCampaign.deleteMany({
        where: { name: { startsWith: prefix } },
      });
      await prisma.store.deleteMany({
        where: { slug: { startsWith: prefix } },
      });
      await prisma.tenant.deleteMany({
        where: { name: { startsWith: prefix } },
      });
      await prisma.panel.deleteMany({
        where: { code: { startsWith: prefix } },
      });
      await prisma.user.deleteMany({
        where: { email: { startsWith: prefix } },
      });
      await prisma.role.deleteMany({
        where: { name: { startsWith: prefix } },
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  it("creates a valid STORE campaign with lifecycle audit fields", async () => {
    const startsAt = new Date(Date.now() - 60_000);
    const endsAt = new Date(Date.now() + 60_000);
    const campaign = await prisma.adCampaign.create({
      data: buildCampaignData({
        name: `${prefix}-valid-campaign`,
        startsAt,
        endsAt,
        impressionLimit: 100,
        createdById: userId,
        updatedById: userId,
        deletedAt: null,
      }),
    });
    campaignId = campaign.id;

    expect(campaign).toEqual(
      expect.objectContaining({
        targetType: AdTargetType.STORE,
        targetStoreId: storeId,
        targetPromotionId: null,
        targetUrl: null,
        impressionLimit: 100,
        createdById: userId,
        updatedById: userId,
        deletedAt: null,
      }),
    );
  });

  it("exposes AdCreative lifecycle fields and named User relations", async () => {
    const creative = await prisma.adCreative.create({
      data: {
        campaignId,
        title: `${prefix}-creative`,
        createdById: userId,
        updatedById: userId,
        deletedAt: null,
      },
    });

    expect(creative).toEqual(
      expect.objectContaining({
        campaignId,
        createdById: userId,
        updatedById: userId,
        deletedAt: null,
      }),
    );

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        createdAdCampaigns: { select: { id: true } },
        updatedAdCampaigns: { select: { id: true } },
        createdAdCreatives: { select: { id: true } },
        updatedAdCreatives: { select: { id: true } },
      },
    });

    expect(user.createdAdCampaigns).toContainEqual({ id: campaignId });
    expect(user.updatedAdCampaigns).toContainEqual({ id: campaignId });
    expect(user.createdAdCreatives).toContainEqual({ id: creative.id });
    expect(user.updatedAdCreatives).toContainEqual({ id: creative.id });
  });

  it("exposes AdSlot lifecycle fields and named Panel/User relations", async () => {
    const slot = await prisma.adSlot.create({
      data: {
        code: `${prefix}-slot`,
        name: `${prefix}-slot`,
        placement: AdPlacement.HOME_PANEL_BANNER,
        panelId,
        createdById: userId,
        updatedById: userId,
      },
    });

    expect(slot).toEqual(
      expect.objectContaining({
        panelId,
        sortOrder: 0,
        isActive: true,
        deletedAt: null,
        createdById: userId,
        updatedById: userId,
      }),
    );

    const [user, panel] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          createdAdSlots: { select: { id: true } },
          updatedAdSlots: { select: { id: true } },
        },
      }),
      prisma.panel.findUniqueOrThrow({
        where: { id: panelId },
        select: { adSlots: { select: { id: true } } },
      }),
    ]);

    expect(user.createdAdSlots).toContainEqual({ id: slot.id });
    expect(user.updatedAdSlots).toContainEqual({ id: slot.id });
    expect(panel.adSlots).toContainEqual({ id: slot.id });
  });

  it("sets AdSlot.panelId to null when its Panel is deleted", async () => {
    const panel = await prisma.panel.create({
      data: {
        code: `${prefix}-set-null-panel`,
        name: `${prefix}-set-null-panel`,
      },
    });
    const slot = await prisma.adSlot.create({
      data: {
        code: `${prefix}-set-null-panel-slot`,
        name: `${prefix}-set-null-panel-slot`,
        placement: AdPlacement.STORE_CARD_BANNER,
        panelId: panel.id,
      },
    });

    await prisma.panel.delete({ where: { id: panel.id } });

    await expect(
      prisma.adSlot.findUniqueOrThrow({ where: { id: slot.id } }),
    ).resolves.toEqual(expect.objectContaining({ panelId: null }));
  });

  it("sets AdSlot audit ids to null when an audit User is deleted", async () => {
    const role = await prisma.role.create({
      data: { name: `${prefix}-audit-role` },
    });
    const user = await prisma.user.create({
      data: {
        email: `${prefix}-audit-user@greenmall.local`,
        passwordHash: "not-used",
        roleId: role.id,
      },
    });
    const slot = await prisma.adSlot.create({
      data: {
        code: `${prefix}-set-null-user-slot`,
        name: `${prefix}-set-null-user-slot`,
        placement: AdPlacement.PROMOTIONS_BANNER,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await prisma.user.delete({ where: { id: user.id } });
    await prisma.role.delete({ where: { id: role.id } });

    await expect(
      prisma.adSlot.findUniqueOrThrow({ where: { id: slot.id } }),
    ).resolves.toEqual(
      expect.objectContaining({
        createdById: null,
        updatedById: null,
      }),
    );
  });

  it("keeps AdSlot code unique after soft deletion", async () => {
    const code = `${prefix}-reserved-slot-code`;

    await prisma.adSlot.create({
      data: {
        code,
        name: `${prefix}-reserved-slot`,
        placement: AdPlacement.MOBILE_HOME_BANNER,
        isActive: false,
        deletedAt: new Date(),
      },
    });

    await expect(
      prisma.adSlot.create({
        data: {
          code,
          name: `${prefix}-duplicate-slot`,
          placement: AdPlacement.MOBILE_HOME_BANNER,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("exposes assignment lifecycle, unique pair and named reverse relations", async () => {
    const campaign = await prisma.adCampaign.create({
      data: {
        name: prefix + "-assignment-campaign",
        placement: AdPlacement.HOME_PANEL_BANNER,
      },
    });
    const slot = await prisma.adSlot.create({
      data: {
        code: prefix + "-assignment-slot",
        name: prefix + "-assignment-slot",
        placement: AdPlacement.HOME_PANEL_BANNER,
      },
    });
    const assignment = await prisma.adCampaignAssignment.create({
      data: {
        campaignId: campaign.id,
        slotId: slot.id,
        createdById: userId,
        updatedById: userId,
      },
    });

    expect(assignment).toEqual(
      expect.objectContaining({
        campaignId: campaign.id,
        slotId: slot.id,
        isActive: true,
        deletedAt: null,
        createdById: userId,
        updatedById: userId,
      }),
    );

    const [campaignRelations, slotRelations, userRelations] = await Promise.all(
      [
        prisma.adCampaign.findUniqueOrThrow({
          where: { id: campaign.id },
          select: { assignments: { select: { id: true } } },
        }),
        prisma.adSlot.findUniqueOrThrow({
          where: { id: slot.id },
          select: { assignments: { select: { id: true } } },
        }),
        prisma.user.findUniqueOrThrow({
          where: { id: userId },
          select: {
            createdAdCampaignAssignments: { select: { id: true } },
            updatedAdCampaignAssignments: { select: { id: true } },
          },
        }),
      ],
    );

    expect(campaignRelations.assignments).toContainEqual({ id: assignment.id });
    expect(slotRelations.assignments).toContainEqual({ id: assignment.id });
    expect(userRelations.createdAdCampaignAssignments).toContainEqual({
      id: assignment.id,
    });
    expect(userRelations.updatedAdCampaignAssignments).toContainEqual({
      id: assignment.id,
    });
    await expect(
      prisma.adCampaignAssignment.create({
        data: { campaignId: campaign.id, slotId: slot.id },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("sets assignment audit ids to null when its audit User is deleted", async () => {
    const role = await prisma.role.create({
      data: { name: prefix + "-assignment-audit-role" },
    });
    const user = await prisma.user.create({
      data: {
        email: prefix + "-assignment-audit-user@greenmall.local",
        passwordHash: "not-used",
        roleId: role.id,
      },
    });
    const campaign = await prisma.adCampaign.create({
      data: {
        name: prefix + "-assignment-audit-campaign",
        placement: AdPlacement.STORE_CARD_BANNER,
      },
    });
    const slot = await prisma.adSlot.create({
      data: {
        code: prefix + "-assignment-audit-slot",
        name: prefix + "-assignment-audit-slot",
        placement: AdPlacement.STORE_CARD_BANNER,
      },
    });
    const assignment = await prisma.adCampaignAssignment.create({
      data: {
        campaignId: campaign.id,
        slotId: slot.id,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await prisma.user.delete({ where: { id: user.id } });
    await prisma.role.delete({ where: { id: role.id } });

    await expect(
      prisma.adCampaignAssignment.findUniqueOrThrow({
        where: { id: assignment.id },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        createdById: null,
        updatedById: null,
      }),
    );
  });

  it("rejects STORE target without targetStoreId", async () => {
    await expectCheckConstraintViolation(
      prisma.adCampaign.create({
        data: buildCampaignData({
          name: `${prefix}-missing-store`,
          targetStoreId: null,
        }),
      }),
      "AdCampaign_valid_target",
    );
  });

  it("rejects multiple populated target fields", async () => {
    await expectCheckConstraintViolation(
      prisma.adCampaign.create({
        data: buildCampaignData({
          name: `${prefix}-multiple-targets`,
          targetUrl: "https://example.test/invalid-extra-target",
        }),
      }),
      "AdCampaign_valid_target",
    );
  });

  it("rejects endsAt equal to startsAt", async () => {
    const boundary = new Date();

    await expectCheckConstraintViolation(
      prisma.adCampaign.create({
        data: buildCampaignData({
          name: `${prefix}-invalid-date-range`,
          startsAt: boundary,
          endsAt: boundary,
        }),
      }),
      "AdCampaign_valid_date_range",
    );
  });

  it("rejects impressionLimit equal to zero", async () => {
    await expectCheckConstraintViolation(
      prisma.adCampaign.create({
        data: buildCampaignData({
          name: `${prefix}-zero-impression-limit`,
          impressionLimit: 0,
        }),
      }),
      "AdCampaign_positive_impression_limit",
    );
  });

  it("rejects a negative impressionLimit", async () => {
    await expectCheckConstraintViolation(
      prisma.adCampaign.create({
        data: buildCampaignData({
          name: `${prefix}-negative-impression-limit`,
          impressionLimit: -1,
        }),
      }),
      "AdCampaign_positive_impression_limit",
    );
  });
});
