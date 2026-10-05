import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AdPlacement, Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("AdCampaignAssignments admin API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const runId = Date.now() + "-" + process.pid;
  const prefix = "ad-campaign-assignments-e2e-" + runId;
  const password = "AdCampaignAssignmentsE2e12345!";
  const createdRoleIds: string[] = [];
  const tokens: Record<string, string> = {};
  const userIds: Record<string, string> = {};
  let sequence = 0;

  const assignmentsUrl = "/api/admin/ad-campaign-assignments";
  const assignmentUrl = (id: string) => assignmentsUrl + "/" + id;
  const campaignUrl = (id: string) => "/api/admin/ad-campaigns/" + id;
  const slotUrl = (id: string) => "/api/admin/ad-slots/" + id;
  const auth = (token: string) => ({ Authorization: "Bearer " + token });
  const unique = (label: string) => label + "-" + ++sequence;

  async function ensureRole(name: string): Promise<string> {
    const existing = await prisma.role.findUnique({
      where: { name },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    const role = await prisma.role.create({
      data: {
        name,
        description: "Temporary role created by AdCampaignAssignment e2e tests",
      },
      select: { id: true },
    });
    createdRoleIds.push(role.id);
    return role.id;
  }

  async function createUserAndLogin(
    roleName: string,
    label: string,
    passwordHash: string,
  ): Promise<void> {
    const roleId = await ensureRole(roleName);
    const email = prefix + "-" + label + "@greenmall.local";
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: "AdCampaignAssignment E2E " + label,
        roleId,
        isActive: true,
      },
      select: { id: true },
    });

    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password })
      .expect(201);

    tokens[label] = response.body.accessToken as string;
    userIds[label] = user.id;
  }

  async function createCampaign(
    label: string,
    data: Partial<Prisma.AdCampaignUncheckedCreateInput> = {},
  ) {
    return prisma.adCampaign.create({
      data: {
        name: prefix + " " + unique(label),
        placement: AdPlacement.HOME_PANEL_BANNER,
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 86_400_000),
        isActive: true,
        ...data,
      },
    });
  }

  async function createSlot(
    label: string,
    data: Partial<Prisma.AdSlotUncheckedCreateInput> = {},
  ) {
    const suffix = unique(label);
    return prisma.adSlot.create({
      data: {
        code: prefix + "-" + suffix,
        name: prefix + " " + suffix,
        placement: AdPlacement.HOME_PANEL_BANNER,
        isActive: true,
        ...data,
      },
    });
  }

  async function createPair(
    label: string,
    campaignData: Partial<Prisma.AdCampaignUncheckedCreateInput> = {},
    slotData: Partial<Prisma.AdSlotUncheckedCreateInput> = {},
  ) {
    const campaign = await createCampaign(label + "-campaign", campaignData);
    const slot = await createSlot(label + "-slot", slotData);
    return { campaign, slot };
  }

  async function createAssignmentDirect(
    campaignId: string,
    slotId: string,
    data: Partial<Prisma.AdCampaignAssignmentUncheckedCreateInput> = {},
  ) {
    return prisma.adCampaignAssignment.create({
      data: {
        campaignId,
        slotId,
        createdById: userIds["ads-manager"],
        updatedById: userIds["ads-manager"],
        ...data,
      },
    });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    const passwordHash = await bcrypt.hash(password, 10);
    await createUserAndLogin("SUPER_ADMIN", "super-admin", passwordHash);
    await createUserAndLogin("MALL_ADMIN", "mall-admin", passwordHash);
    await createUserAndLogin("ADS_MANAGER", "ads-manager", passwordHash);
    await createUserAndLogin(
      "CONTENT_MANAGER",
      "content-manager",
      passwordHash,
    );
    await createUserAndLogin(
      "ANALYTICS_VIEWER",
      "analytics-viewer",
      passwordHash,
    );
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.adCampaignAssignment.deleteMany({
          where: {
            OR: [
              { campaign: { name: { startsWith: prefix } } },
              { slot: { code: { startsWith: prefix } } },
            ],
          },
        });
        await prisma.adSlot.deleteMany({
          where: { code: { startsWith: prefix } },
        });
        await prisma.adCampaign.deleteMany({
          where: { name: { startsWith: prefix } },
        });
        await prisma.user.deleteMany({
          where: { email: { startsWith: prefix } },
        });
        if (createdRoleIds.length > 0) {
          await prisma.role.deleteMany({
            where: { id: { in: createdRoleIds } },
          });
        }
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it("returns 401 without JWT", async () => {
    await request(app.getHttpServer()).get(assignmentsUrl).expect(401);
  });

  it.each(["super-admin", "mall-admin", "ads-manager"])(
    "allows %s to read and create assignments",
    async (label) => {
      const { campaign, slot } = await createPair("rbac-allowed-" + label);
      await request(app.getHttpServer())
        .get(assignmentsUrl)
        .set(auth(tokens[label]))
        .expect(200);
      await request(app.getHttpServer())
        .post(assignmentsUrl)
        .set(auth(tokens[label]))
        .send({ campaignId: campaign.id, slotId: slot.id })
        .expect(201);
    },
  );

  it.each(["content-manager", "analytics-viewer"])(
    "returns 403 for every endpoint to %s",
    async (label) => {
      const { campaign, slot } = await createPair("rbac-forbidden-" + label);
      const assignment = await createAssignmentDirect(campaign.id, slot.id);
      const headers = auth(tokens[label]);

      await request(app.getHttpServer())
        .get(assignmentsUrl)
        .set(headers)
        .expect(403);
      await request(app.getHttpServer())
        .get(assignmentUrl(assignment.id))
        .set(headers)
        .expect(403);
      await request(app.getHttpServer())
        .post(assignmentsUrl)
        .set(headers)
        .send({ campaignId: campaign.id, slotId: slot.id })
        .expect(403);
      await request(app.getHttpServer())
        .patch(assignmentUrl(assignment.id))
        .set(headers)
        .send({ isActive: false })
        .expect(403);
      await request(app.getHttpServer())
        .delete(assignmentUrl(assignment.id))
        .set(headers)
        .expect(403);
    },
  );

  it("creates an active assignment with JWT audit and concise relations", async () => {
    const { campaign, slot } = await createPair("create-active");
    const response = await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["ads-manager"]))
      .send({ campaignId: campaign.id, slotId: slot.id })
      .expect(201);

    expect(response.body).toMatchObject({
      campaignId: campaign.id,
      slotId: slot.id,
      isActive: true,
      deletedAt: null,
      createdById: userIds["ads-manager"],
      updatedById: userIds["ads-manager"],
      campaign: {
        id: campaign.id,
        placement: AdPlacement.HOME_PANEL_BANNER,
      },
      slot: {
        id: slot.id,
        placement: AdPlacement.HOME_PANEL_BANNER,
      },
    });
    expect(response.body.createdBy).not.toHaveProperty("passwordHash");
    expect(response.body.updatedBy).not.toHaveProperty("passwordHash");
  });

  it("creates an inactive draft assignment", async () => {
    const { campaign, slot } = await createPair("create-draft");
    const response = await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["ads-manager"]))
      .send({
        campaignId: campaign.id,
        slotId: slot.id,
        isActive: false,
      })
      .expect(201);

    expect(response.body.isActive).toBe(false);
  });

  it("returns 404 for a missing Campaign or Slot", async () => {
    const { campaign, slot } = await createPair("missing-references");

    await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["ads-manager"]))
      .send({ campaignId: "missing-campaign", slotId: slot.id })
      .expect(404);
    await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["ads-manager"]))
      .send({ campaignId: campaign.id, slotId: "missing-slot" })
      .expect(404);
  });

  it("returns 404 for soft-deleted dependencies even for drafts", async () => {
    const deletedCampaign = await createCampaign("deleted-campaign", {
      isActive: false,
      deletedAt: new Date(),
    });
    const activeSlot = await createSlot("deleted-campaign-slot");
    const activeCampaign = await createCampaign("deleted-slot-campaign");
    const deletedSlot = await createSlot("deleted-slot", {
      isActive: false,
      deletedAt: new Date(),
    });

    await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["ads-manager"]))
      .send({
        campaignId: deletedCampaign.id,
        slotId: activeSlot.id,
        isActive: false,
      })
      .expect(404);
    await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["ads-manager"]))
      .send({
        campaignId: activeCampaign.id,
        slotId: deletedSlot.id,
        isActive: false,
      })
      .expect(404);
  });

  it.each([true, false])(
    "returns 409 for placement mismatch when isActive=%s",
    async (isActive) => {
      const campaign = await createCampaign("mismatch-campaign");
      const slot = await createSlot("mismatch-slot", {
        placement: AdPlacement.STORE_CARD_BANNER,
      });

      await request(app.getHttpServer())
        .post(assignmentsUrl)
        .set(auth(tokens["ads-manager"]))
        .send({ campaignId: campaign.id, slotId: slot.id, isActive })
        .expect(409);
    },
  );

  it("rejects active assignments for inactive or expired dependencies", async () => {
    const inactiveCampaignPair = await createPair("inactive-campaign", {
      isActive: false,
    });
    const inactiveSlotPair = await createPair(
      "inactive-slot",
      {},
      { isActive: false },
    );
    const expiredPair = await createPair("expired-campaign", {
      startsAt: new Date(Date.now() - 172_800_000),
      endsAt: new Date(Date.now() - 86_400_000),
    });

    for (const pair of [inactiveCampaignPair, inactiveSlotPair, expiredPair]) {
      await request(app.getHttpServer())
        .post(assignmentsUrl)
        .set(auth(tokens["ads-manager"]))
        .send({ campaignId: pair.campaign.id, slotId: pair.slot.id })
        .expect(409);
    }
  });

  it("allows an active assignment for a future Campaign", async () => {
    const { campaign, slot } = await createPair("future-campaign", {
      startsAt: new Date(Date.now() + 86_400_000),
      endsAt: new Date(Date.now() + 172_800_000),
    });

    await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["ads-manager"]))
      .send({ campaignId: campaign.id, slotId: slot.id })
      .expect(201);
  });

  it("allows drafts with inactive or expired dependencies", async () => {
    const inactiveCampaignPair = await createPair("draft-inactive-campaign", {
      isActive: false,
    });
    const inactiveSlotPair = await createPair(
      "draft-inactive-slot",
      {},
      { isActive: false },
    );
    const expiredPair = await createPair("draft-expired-campaign", {
      startsAt: new Date(Date.now() - 172_800_000),
      endsAt: new Date(Date.now() - 86_400_000),
    });

    for (const pair of [inactiveCampaignPair, inactiveSlotPair, expiredPair]) {
      await request(app.getHttpServer())
        .post(assignmentsUrl)
        .set(auth(tokens["ads-manager"]))
        .send({
          campaignId: pair.campaign.id,
          slotId: pair.slot.id,
          isActive: false,
        })
        .expect(201);
    }
  });

  it("returns 409 for a duplicate non-deleted pair", async () => {
    const { campaign, slot } = await createPair("duplicate");
    const body = { campaignId: campaign.id, slotId: slot.id };

    await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["ads-manager"]))
      .send(body)
      .expect(201);
    await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["ads-manager"]))
      .send(body)
      .expect(409);
  });

  it("serializes concurrent creation of the same pair", async () => {
    const { campaign, slot } = await createPair("concurrent-create");
    const body = { campaignId: campaign.id, slotId: slot.id };

    const responses = await Promise.all([
      request(app.getHttpServer())
        .post(assignmentsUrl)
        .set(auth(tokens["ads-manager"]))
        .send(body),
      request(app.getHttpServer())
        .post(assignmentsUrl)
        .set(auth(tokens["mall-admin"]))
        .send(body),
    ]);

    expect(responses.map(({ status }) => status).sort((a, b) => a - b)).toEqual(
      [201, 409],
    );
    expect(
      await prisma.adCampaignAssignment.count({
        where: { campaignId: campaign.id, slotId: slot.id },
      }),
    ).toBe(1);
  });

  it("restores the same soft-deleted row and preserves creation audit", async () => {
    const { campaign, slot } = await createPair("restore");
    const created = await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["ads-manager"]))
      .send({ campaignId: campaign.id, slotId: slot.id })
      .expect(201);

    await request(app.getHttpServer())
      .delete(assignmentUrl(created.body.id as string))
      .set(auth(tokens["mall-admin"]))
      .expect(200);
    await new Promise((resolve) => setTimeout(resolve, 5));

    const restored = await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["super-admin"]))
      .send({
        campaignId: campaign.id,
        slotId: slot.id,
        isActive: false,
      })
      .expect(201);

    expect(restored.body).toMatchObject({
      id: created.body.id,
      createdAt: created.body.createdAt,
      createdById: userIds["ads-manager"],
      updatedById: userIds["super-admin"],
      deletedAt: null,
      isActive: false,
    });
    expect(restored.body.updatedAt).not.toBe(created.body.updatedAt);
    expect(
      await prisma.adCampaignAssignment.count({
        where: { campaignId: campaign.id, slotId: slot.id },
      }),
    ).toBe(1);
  });

  it("revalidates current placement before restoring a pair", async () => {
    const { campaign, slot } = await createPair("restore-validation");
    const created = await createAssignmentDirect(campaign.id, slot.id);
    await request(app.getHttpServer())
      .delete(assignmentUrl(created.id))
      .set(auth(tokens["ads-manager"]))
      .expect(200);

    await request(app.getHttpServer())
      .patch(campaignUrl(campaign.id))
      .set(auth(tokens["ads-manager"]))
      .send({ placement: AdPlacement.STORE_CARD_BANNER })
      .expect(200);

    await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["ads-manager"]))
      .send({
        campaignId: campaign.id,
        slotId: slot.id,
        isActive: false,
      })
      .expect(409);
  });

  it("revalidates dependency activity before an active restore", async () => {
    const { campaign, slot } = await createPair("restore-activity");
    await createAssignmentDirect(campaign.id, slot.id, {
      isActive: false,
      deletedAt: new Date(),
    });
    await prisma.adCampaign.update({
      where: { id: campaign.id },
      data: { isActive: false },
    });

    await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["ads-manager"]))
      .send({ campaignId: campaign.id, slotId: slot.id, isActive: true })
      .expect(409);
  });

  it("keeps a soft-deleted assignment deleted when active restore references an inactive Slot", async () => {
    const { campaign, slot } = await createPair("restore-inactive-slot");
    const assignment = await createAssignmentDirect(campaign.id, slot.id, {
      isActive: false,
      deletedAt: new Date(),
    });
    await prisma.adSlot.update({
      where: { id: slot.id },
      data: { isActive: false },
    });

    await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["ads-manager"]))
      .send({ campaignId: campaign.id, slotId: slot.id, isActive: true })
      .expect(409);

    const stored = await prisma.adCampaignAssignment.findUnique({
      where: { id: assignment.id },
    });
    expect(stored).toMatchObject({ id: assignment.id, isActive: false });
    expect(stored?.deletedAt).not.toBeNull();
  });

  it("keeps a soft-deleted assignment deleted when active restore references an expired Campaign", async () => {
    const now = Date.now();
    const { campaign, slot } = await createPair("restore-expired-campaign", {
      startsAt: new Date(now - 120_000),
      endsAt: new Date(now - 60_000),
    });
    const assignment = await createAssignmentDirect(campaign.id, slot.id, {
      isActive: false,
      deletedAt: new Date(),
    });

    await request(app.getHttpServer())
      .post(assignmentsUrl)
      .set(auth(tokens["ads-manager"]))
      .send({ campaignId: campaign.id, slotId: slot.id, isActive: true })
      .expect(409);

    const stored = await prisma.adCampaignAssignment.findUnique({
      where: { id: assignment.id },
    });
    expect(stored).toMatchObject({ id: assignment.id, isActive: false });
    expect(stored?.deletedAt).not.toBeNull();
  });

  it("serializes concurrent restores of the same soft-deleted pair", async () => {
    const { campaign, slot } = await createPair("concurrent-restore");
    const assignment = await createAssignmentDirect(campaign.id, slot.id, {
      isActive: false,
      deletedAt: new Date(),
    });
    const body = {
      campaignId: campaign.id,
      slotId: slot.id,
      isActive: true,
    };

    const responses = await Promise.all([
      request(app.getHttpServer())
        .post(assignmentsUrl)
        .set(auth(tokens["ads-manager"]))
        .send(body),
      request(app.getHttpServer())
        .post(assignmentsUrl)
        .set(auth(tokens["mall-admin"]))
        .send(body),
    ]);

    expect(responses.map(({ status }) => status).sort((a, b) => a - b)).toEqual(
      [201, 409],
    );
    const stored = await prisma.adCampaignAssignment.findMany({
      where: { campaignId: campaign.id, slotId: slot.id },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ id: assignment.id, isActive: true });
    expect(stored[0].deletedAt).toBeNull();
  });

  it("returns one assignment by id with safe related projections", async () => {
    const { campaign, slot } = await createPair("find-one");
    const assignment = await createAssignmentDirect(campaign.id, slot.id);
    const response = await request(app.getHttpServer())
      .get(assignmentUrl(assignment.id))
      .set(auth(tokens["ads-manager"]))
      .expect(200);

    expect(response.body).toMatchObject({
      id: assignment.id,
      campaign: { id: campaign.id },
      slot: { id: slot.id },
    });
    expect(response.body.campaign).not.toHaveProperty("metadata");
    expect(response.body.slot).not.toHaveProperty("metadata");
    expect(response.body.createdBy).not.toHaveProperty("passwordHash");
  });

  it("supports pagination and campaignId, slotId and isActive filters", async () => {
    const campaign = await createCampaign("list-filter-campaign");
    const firstSlot = await createSlot("list-filter-slot-one");
    const secondSlot = await createSlot("list-filter-slot-two");
    const first = await createAssignmentDirect(campaign.id, firstSlot.id);
    const second = await createAssignmentDirect(campaign.id, secondSlot.id, {
      isActive: false,
    });

    const firstPage = await request(app.getHttpServer())
      .get(assignmentsUrl)
      .query({ campaignId: campaign.id, page: 1, limit: 1 })
      .set(auth(tokens["ads-manager"]))
      .expect(200);
    const secondPage = await request(app.getHttpServer())
      .get(assignmentsUrl)
      .query({ campaignId: campaign.id, page: 2, limit: 1 })
      .set(auth(tokens["ads-manager"]))
      .expect(200);
    const bySlot = await request(app.getHttpServer())
      .get(assignmentsUrl)
      .query({ slotId: firstSlot.id })
      .set(auth(tokens["ads-manager"]))
      .expect(200);
    const inactive = await request(app.getHttpServer())
      .get(assignmentsUrl)
      .query({ campaignId: campaign.id, isActive: false })
      .set(auth(tokens["ads-manager"]))
      .expect(200);

    expect(firstPage.body.pagination).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
    expect(secondPage.body.items).toHaveLength(1);
    expect(
      new Set([firstPage.body.items[0].id, secondPage.body.items[0].id]),
    ).toEqual(new Set([first.id, second.id]));
    expect(bySlot.body.items.map((item: { id: string }) => item.id)).toEqual([
      first.id,
    ]);
    expect(inactive.body.items.map((item: { id: string }) => item.id)).toEqual([
      second.id,
    ]);
  });

  it("excludes soft-deleted assignments from list and GET by id", async () => {
    const { campaign, slot } = await createPair("read-deleted");
    const assignment = await createAssignmentDirect(campaign.id, slot.id, {
      isActive: false,
      deletedAt: new Date(),
    });

    const list = await request(app.getHttpServer())
      .get(assignmentsUrl)
      .query({ campaignId: campaign.id })
      .set(auth(tokens["ads-manager"]))
      .expect(200);
    expect(list.body.items).toEqual([]);
    await request(app.getHttpServer())
      .get(assignmentUrl(assignment.id))
      .set(auth(tokens["ads-manager"]))
      .expect(404);
  });

  it("deactivates and reactivates a valid assignment with updated audit", async () => {
    const { campaign, slot } = await createPair("patch-valid");
    const assignment = await createAssignmentDirect(campaign.id, slot.id);

    const deactivated = await request(app.getHttpServer())
      .patch(assignmentUrl(assignment.id))
      .set(auth(tokens["mall-admin"]))
      .send({ isActive: false })
      .expect(200);
    expect(deactivated.body).toMatchObject({
      isActive: false,
      updatedById: userIds["mall-admin"],
    });

    const activated = await request(app.getHttpServer())
      .patch(assignmentUrl(assignment.id))
      .set(auth(tokens["super-admin"]))
      .send({ isActive: true })
      .expect(200);
    expect(activated.body).toMatchObject({
      isActive: true,
      updatedById: userIds["super-admin"],
    });
  });

  it("allows deactivation when Campaign and Slot are inactive", async () => {
    const { campaign, slot } = await createPair(
      "patch-deactivate-inactive",
      { isActive: false },
      { isActive: false },
    );
    const assignment = await createAssignmentDirect(campaign.id, slot.id);

    await request(app.getHttpServer())
      .patch(assignmentUrl(assignment.id))
      .set(auth(tokens["ads-manager"]))
      .send({ isActive: false })
      .expect(200);
  });

  it("rejects activation for inactive or expired dependencies", async () => {
    const inactiveCampaignPair = await createPair("patch-inactive-campaign", {
      isActive: false,
    });
    const inactiveSlotPair = await createPair(
      "patch-inactive-slot",
      {},
      { isActive: false },
    );
    const expiredPair = await createPair("patch-expired", {
      startsAt: new Date(Date.now() - 172_800_000),
      endsAt: new Date(Date.now() - 86_400_000),
    });

    for (const pair of [inactiveCampaignPair, inactiveSlotPair, expiredPair]) {
      const assignment = await createAssignmentDirect(
        pair.campaign.id,
        pair.slot.id,
        { isActive: false },
      );
      await request(app.getHttpServer())
        .patch(assignmentUrl(assignment.id))
        .set(auth(tokens["ads-manager"]))
        .send({ isActive: true })
        .expect(409);
    }
  });

  it("allows activation for a future Campaign", async () => {
    const { campaign, slot } = await createPair("patch-future", {
      startsAt: new Date(Date.now() + 86_400_000),
      endsAt: new Date(Date.now() + 172_800_000),
    });
    const assignment = await createAssignmentDirect(campaign.id, slot.id, {
      isActive: false,
    });

    await request(app.getHttpServer())
      .patch(assignmentUrl(assignment.id))
      .set(auth(tokens["ads-manager"]))
      .send({ isActive: true })
      .expect(200);
  });

  it("rejects immutable ids, missing state and null state in PATCH", async () => {
    const { campaign, slot } = await createPair("patch-dto");
    const assignment = await createAssignmentDirect(campaign.id, slot.id);

    await request(app.getHttpServer())
      .patch(assignmentUrl(assignment.id))
      .set(auth(tokens["ads-manager"]))
      .send({ campaignId: "replacement", isActive: false })
      .expect(400);
    await request(app.getHttpServer())
      .patch(assignmentUrl(assignment.id))
      .set(auth(tokens["ads-manager"]))
      .send({ slotId: "replacement", isActive: false })
      .expect(400);
    await request(app.getHttpServer())
      .patch(assignmentUrl(assignment.id))
      .set(auth(tokens["ads-manager"]))
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .patch(assignmentUrl(assignment.id))
      .set(auth(tokens["ads-manager"]))
      .send({ isActive: null })
      .expect(400);
  });

  it("soft-deletes without removing the row and rejects repeated lifecycle calls", async () => {
    const { campaign, slot } = await createPair("delete");
    const assignment = await createAssignmentDirect(campaign.id, slot.id);

    const deleted = await request(app.getHttpServer())
      .delete(assignmentUrl(assignment.id))
      .set(auth(tokens["mall-admin"]))
      .expect(200);
    expect(deleted.body.isActive).toBe(false);
    expect(deleted.body.deletedAt).not.toBeNull();
    expect(deleted.body.updatedById).toBe(userIds["mall-admin"]);

    const stored = await prisma.adCampaignAssignment.findUnique({
      where: { id: assignment.id },
    });
    expect(stored).toMatchObject({
      id: assignment.id,
      isActive: false,
      updatedById: userIds["mall-admin"],
    });
    expect(stored?.deletedAt).not.toBeNull();

    await request(app.getHttpServer())
      .patch(assignmentUrl(assignment.id))
      .set(auth(tokens["ads-manager"]))
      .send({ isActive: true })
      .expect(404);
    await request(app.getHttpServer())
      .delete(assignmentUrl(assignment.id))
      .set(auth(tokens["ads-manager"]))
      .expect(404);
  });

  it.each([true, false])(
    "blocks Campaign placement changes for non-deleted isActive=%s assignments",
    async (isActive) => {
      const { campaign, slot } = await createPair(
        "campaign-placement-" + isActive,
      );
      await createAssignmentDirect(campaign.id, slot.id, { isActive });

      const response = await request(app.getHttpServer())
        .patch(campaignUrl(campaign.id))
        .set(auth(tokens["ads-manager"]))
        .send({ placement: AdPlacement.STORE_CARD_BANNER })
        .expect(409);
      expect(response.body.message).toContain("assigned ad slot");
    },
  );

  it.each([true, false])(
    "blocks Slot placement changes for non-deleted isActive=%s assignments",
    async (isActive) => {
      const { campaign, slot } = await createPair("slot-placement-" + isActive);
      await createAssignmentDirect(campaign.id, slot.id, { isActive });

      const response = await request(app.getHttpServer())
        .patch(slotUrl(slot.id))
        .set(auth(tokens["ads-manager"]))
        .send({ placement: AdPlacement.STORE_CARD_BANNER })
        .expect(409);
      expect(response.body.message).toContain("assigned ad campaign");
    },
  );

  it("allows Campaign and Slot placement changes after assignment soft delete", async () => {
    const { campaign, slot } = await createPair("placement-after-delete");
    await createAssignmentDirect(campaign.id, slot.id, {
      isActive: false,
      deletedAt: new Date(),
    });

    await request(app.getHttpServer())
      .patch(campaignUrl(campaign.id))
      .set(auth(tokens["ads-manager"]))
      .send({ placement: AdPlacement.STORE_CARD_BANNER })
      .expect(200);
    await request(app.getHttpServer())
      .patch(slotUrl(slot.id))
      .set(auth(tokens["ads-manager"]))
      .send({ placement: AdPlacement.STORE_CARD_BANNER })
      .expect(200);
  });

  it("allows unrelated and no-op placement updates while assigned", async () => {
    const { campaign, slot } = await createPair("placement-no-op");
    await createAssignmentDirect(campaign.id, slot.id);

    const campaignResponse = await request(app.getHttpServer())
      .patch(campaignUrl(campaign.id))
      .set(auth(tokens["ads-manager"]))
      .send({
        name: prefix + " renamed assigned campaign",
        placement: AdPlacement.HOME_PANEL_BANNER,
      })
      .expect(200);
    const slotResponse = await request(app.getHttpServer())
      .patch(slotUrl(slot.id))
      .set(auth(tokens["ads-manager"]))
      .send({
        name: prefix + " renamed assigned slot",
        placement: AdPlacement.HOME_PANEL_BANNER,
      })
      .expect(200);

    expect(campaignResponse.body.name).toContain("renamed assigned campaign");
    expect(slotResponse.body.name).toContain("renamed assigned slot");
  });

  it("serializes Assignment creation against a concurrent Campaign placement change", async () => {
    const { campaign, slot } = await createPair("campaign-placement-race");

    const [assignmentResponse, campaignResponse] = await Promise.all([
      request(app.getHttpServer())
        .post(assignmentsUrl)
        .set(auth(tokens["ads-manager"]))
        .send({ campaignId: campaign.id, slotId: slot.id }),
      request(app.getHttpServer())
        .patch(campaignUrl(campaign.id))
        .set(auth(tokens["mall-admin"]))
        .send({ placement: AdPlacement.STORE_CARD_BANNER }),
    ]);

    expect(
      [assignmentResponse, campaignResponse].filter(({ status }) =>
        [200, 201].includes(status),
      ),
    ).toHaveLength(1);
    expect(
      [assignmentResponse, campaignResponse].filter(
        ({ status }) => status === 409,
      ),
    ).toHaveLength(1);

    const storedAssignments = await prisma.adCampaignAssignment.findMany({
      where: {
        campaignId: campaign.id,
        slotId: slot.id,
        deletedAt: null,
      },
      include: {
        campaign: { select: { placement: true } },
        slot: { select: { placement: true } },
      },
    });
    expect(storedAssignments).toHaveLength(
      assignmentResponse.status === 201 ? 1 : 0,
    );
    expect(
      storedAssignments.every(
        (stored) => stored.campaign.placement === stored.slot.placement,
      ),
    ).toBe(true);
  });

  it("serializes Assignment creation against a concurrent Slot placement change", async () => {
    const { campaign, slot } = await createPair("slot-placement-race");

    const [assignmentResponse, slotResponse] = await Promise.all([
      request(app.getHttpServer())
        .post(assignmentsUrl)
        .set(auth(tokens["ads-manager"]))
        .send({ campaignId: campaign.id, slotId: slot.id }),
      request(app.getHttpServer())
        .patch(slotUrl(slot.id))
        .set(auth(tokens["super-admin"]))
        .send({ placement: AdPlacement.STORE_CARD_BANNER }),
    ]);

    expect(
      [assignmentResponse, slotResponse].filter(({ status }) =>
        [200, 201].includes(status),
      ),
    ).toHaveLength(1);
    expect(
      [assignmentResponse, slotResponse].filter(({ status }) => status === 409),
    ).toHaveLength(1);

    const storedAssignments = await prisma.adCampaignAssignment.findMany({
      where: {
        campaignId: campaign.id,
        slotId: slot.id,
        deletedAt: null,
      },
      include: {
        campaign: { select: { placement: true } },
        slot: { select: { placement: true } },
      },
    });
    expect(storedAssignments).toHaveLength(
      assignmentResponse.status === 201 ? 1 : 0,
    );
    expect(
      storedAssignments.every(
        (stored) => stored.campaign.placement === stored.slot.placement,
      ),
    ).toBe(true);
  });
});
