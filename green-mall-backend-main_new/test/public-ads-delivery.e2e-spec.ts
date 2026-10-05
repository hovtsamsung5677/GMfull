import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import {
  AdPlacement,
  AdTargetType,
  AnalyticsEventType,
  AnalyticsSource,
  FileAssetKind,
  Prisma,
} from "@prisma/client";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/database/prisma.service";

describe("Public ads delivery API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let activeImageId: string;

  const runId = Date.now() + "-" + process.pid;
  const prefix = "public-ads-e2e-" + runId;
  let sequence = 0;

  const unique = (label: string) => label + "-" + ++sequence;
  const deliveryUrl = (slotCode: string) => "/api/public/ads/slots/" + slotCode;

  async function createAsset(
    label: string,
    data: Partial<Prisma.FileAssetUncheckedCreateInput> = {},
  ) {
    const suffix = unique(label);
    return prisma.fileAsset.create({
      data: {
        filename: prefix + "-" + suffix + ".png",
        originalName: suffix + ".png",
        mimeType: "image/png",
        size: 2048,
        url: "https://cdn.greenmall.test/" + prefix + "/" + suffix + ".png",
        path: "/private/" + prefix + "/" + suffix + ".png",
        provider: "e2e",
        kind: FileAssetKind.IMAGE,
        isActive: true,
        metadata: { suite: "public-ads-delivery" },
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
        metadata: { privateSlotData: true },
        ...data,
      },
    });
  }

  async function createTenant(
    label: string,
    data: Partial<Prisma.TenantUncheckedCreateInput> = {},
  ) {
    return prisma.tenant.create({
      data: {
        name: prefix + " " + unique(label),
        isActive: true,
        ...data,
      },
    });
  }

  async function createStore(
    label: string,
    tenantId: string,
    data: Partial<Prisma.StoreUncheckedCreateInput> = {},
  ) {
    const suffix = unique(label);
    return prisma.store.create({
      data: {
        tenantId,
        name: prefix + " " + suffix,
        slug: prefix + "-" + suffix,
        isActive: true,
        isVisible: true,
        ...data,
      },
    });
  }

  async function createPromotion(
    label: string,
    tenantId: string,
    storeId: string,
    data: Partial<Prisma.PromotionUncheckedCreateInput> = {},
  ) {
    const suffix = unique(label);
    return prisma.promotion.create({
      data: {
        title: prefix + " " + suffix,
        slug: prefix + "-" + suffix,
        tenantId,
        storeId,
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 86_400_000),
        isActive: true,
        ...data,
      },
    });
  }

  async function createCampaign(
    label: string,
    data: Partial<Prisma.AdCampaignUncheckedCreateInput> = {},
  ) {
    return prisma.adCampaign.create({
      data: {
        name: prefix + " " + unique(label),
        placement: AdPlacement.HOME_PANEL_BANNER,
        targetType: AdTargetType.NONE,
        targetStoreId: null,
        targetPromotionId: null,
        targetUrl: null,
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 86_400_000),
        priority: 0,
        impressionLimit: 25,
        isActive: true,
        metadata: { privateCampaignData: true },
        ...data,
      },
    });
  }

  async function createCreative(
    campaignId: string,
    label: string,
    data: Partial<Prisma.AdCreativeUncheckedCreateInput> = {},
  ) {
    return prisma.adCreative.create({
      data: {
        campaignId,
        assetId: activeImageId,
        title: prefix + " " + unique(label),
        description: "Public advertising creative",
        altText: "Advertising banner",
        ctaText: "Open",
        isActive: true,
        sortOrder: 0,
        metadata: { privateCreativeData: true },
        ...data,
      },
    });
  }

  async function createAssignment(
    campaignId: string,
    slotId: string,
    data: Partial<Prisma.AdCampaignAssignmentUncheckedCreateInput> = {},
  ) {
    return prisma.adCampaignAssignment.create({
      data: {
        campaignId,
        slotId,
        isActive: true,
        ...data,
      },
    });
  }

  async function createAdvertisingEvent(
    campaignId: string,
    type: AnalyticsEventType,
    data: Partial<Prisma.AnalyticsEventUncheckedCreateInput> = {},
  ) {
    return prisma.analyticsEvent.create({
      data: {
        clientEventId:
          prefix + "-analytics-event-" + unique(type.toLowerCase()),
        type,
        source: AnalyticsSource.MOBILE,
        campaignId,
        ...data,
      },
    });
  }

  async function createReadyAd(
    label: string,
    options: {
      slot?: Partial<Prisma.AdSlotUncheckedCreateInput>;
      campaign?: Partial<Prisma.AdCampaignUncheckedCreateInput>;
      creative?: Partial<Prisma.AdCreativeUncheckedCreateInput>;
      assignment?: Partial<Prisma.AdCampaignAssignmentUncheckedCreateInput>;
    } = {},
  ) {
    const slot = await createSlot(label + "-slot", options.slot);
    const campaign = await createCampaign(
      label + "-campaign",
      options.campaign,
    );
    const creative = await createCreative(
      campaign.id,
      label + "-creative",
      options.creative,
    );
    const assignment = await createAssignment(
      campaign.id,
      slot.id,
      options.assignment,
    );
    return { slot, campaign, creative, assignment };
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
    activeImageId = (await createAsset("shared-active-image")).id;
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.analyticsEvent.deleteMany({
          where: { clientEventId: { startsWith: prefix } },
        });
        await prisma.adCampaignAssignment.deleteMany({
          where: {
            OR: [
              { campaign: { name: { startsWith: prefix } } },
              { slot: { code: { startsWith: prefix } } },
            ],
          },
        });
        await prisma.adCreative.deleteMany({
          where: { campaign: { name: { startsWith: prefix } } },
        });
        await prisma.adCampaign.deleteMany({
          where: { name: { startsWith: prefix } },
        });
        await prisma.adSlot.deleteMany({
          where: { code: { startsWith: prefix } },
        });
        await prisma.promotion.deleteMany({
          where: { slug: { startsWith: prefix } },
        });
        await prisma.store.deleteMany({
          where: { slug: { startsWith: prefix } },
        });
        await prisma.tenant.deleteMany({
          where: { name: { startsWith: prefix } },
        });
        await prisma.fileAsset.deleteMany({
          where: { filename: { startsWith: prefix } },
        });
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it("is public and returns an active Slot without JWT", async () => {
    const slot = await createSlot("public-no-jwt");

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body).toEqual({
      slot: {
        code: slot.code,
        placement: AdPlacement.HOME_PANEL_BANNER,
      },
      ad: null,
    });
  });

  it("does not require or validate an Authorization header", async () => {
    const slot = await createSlot("public-invalid-auth");

    await request(app.getHttpServer())
      .get(deliveryUrl(slot.code.toUpperCase()))
      .set({ Authorization: "Bearer invalid-public-token" })
      .expect(200);
  });

  it("returns 404 for a missing Slot", async () => {
    const response = await request(app.getHttpServer())
      .get(deliveryUrl(prefix + "-missing-slot"))
      .expect(404);

    expect(response.body.message).toBe("Ad slot not found");
  });

  it.each([
    ["inactive", { isActive: false }],
    ["soft-deleted", { deletedAt: new Date() }],
  ] as const)("returns 404 for a %s Slot", async (label, slotData) => {
    const slot = await createSlot("slot-" + label, slotData);

    await request(app.getHttpServer()).get(deliveryUrl(slot.code)).expect(404);
  });

  it("selects an active non-deleted Assignment", async () => {
    const { slot, campaign, creative } =
      await createReadyAd("active-assignment");

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: campaign.id,
      creative: { id: creative.id },
    });
  });

  it.each([
    ["inactive", { isActive: false }],
    ["soft-deleted", { deletedAt: new Date() }],
  ] as const)("ignores a %s Assignment", async (label, assignmentData) => {
    const { slot } = await createReadyAd("assignment-" + label, {
      assignment: assignmentData,
    });

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toBeNull();
  });

  it("selects an active current Campaign", async () => {
    const { slot, campaign } = await createReadyAd("current-campaign");

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad.campaignId).toBe(campaign.id);
  });

  it.each([
    ["inactive", { isActive: false }],
    ["soft-deleted", { deletedAt: new Date() }],
    [
      "future",
      {
        startsAt: new Date(Date.now() + 86_400_000),
        endsAt: new Date(Date.now() + 172_800_000),
      },
    ],
    [
      "expired",
      {
        startsAt: new Date(Date.now() - 120_000),
        endsAt: new Date(Date.now() - 60_000),
      },
    ],
  ] as const)("ignores a %s Campaign", async (label, campaignData) => {
    const { slot } = await createReadyAd("campaign-" + label, {
      campaign: campaignData,
    });

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toBeNull();
  });

  it("accepts startsAt at or before request time", async () => {
    const startsAt = new Date();
    const { slot, campaign } = await createReadyAd("campaign-start-boundary", {
      campaign: {
        startsAt,
        endsAt: new Date(startsAt.getTime() + 86_400_000),
      },
    });

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad.campaignId).toBe(campaign.id);
  });

  it("accepts endsAt strictly later than request time", async () => {
    const { slot, campaign } = await createReadyAd("campaign-future-end", {
      campaign: {
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 86_400_000),
      },
    });

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad.campaignId).toBe(campaign.id);
  });

  it("defensively ignores a Campaign with mismatched placement without 409", async () => {
    const { slot } = await createReadyAd("placement-mismatch", {
      campaign: { placement: AdPlacement.MOBILE_HOME_BANNER },
    });

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toBeNull();
  });

  it("selects an active non-deleted Creative with an active IMAGE asset", async () => {
    const { slot, creative } = await createReadyAd("active-creative");

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad.creative).toMatchObject({
      id: creative.id,
      asset: {
        id: activeImageId,
        kind: FileAssetKind.IMAGE,
      },
    });
  });

  it.each([
    ["inactive", { isActive: false }],
    ["soft-deleted", { deletedAt: new Date() }],
    ["without an asset", { assetId: null }],
  ] as const)("ignores a Creative that is %s", async (label, creativeData) => {
    const { slot } = await createReadyAd("creative-" + label, {
      creative: creativeData,
    });

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toBeNull();
  });

  it("ignores a Creative whose FileAsset is inactive", async () => {
    const inactiveAsset = await createAsset("inactive-creative-asset", {
      isActive: false,
    });
    const { slot } = await createReadyAd("inactive-asset-creative", {
      creative: { assetId: inactiveAsset.id },
    });

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toBeNull();
  });

  it("enforces the existing AdCreative IMAGE asset invariant", async () => {
    const videoAsset = await createAsset("video-creative-asset", {
      kind: FileAssetKind.VIDEO,
      mimeType: "video/mp4",
    });
    const { slot } = await createReadyAd("video-asset-creative", {
      creative: { assetId: videoAsset.id },
    });

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toBeNull();
  });

  it("selects the Campaign with the highest priority", async () => {
    const slot = await createSlot("campaign-priority-slot");
    const lower = await createCampaign("campaign-priority-lower", {
      priority: 10,
    });
    const higher = await createCampaign("campaign-priority-higher", {
      priority: 100,
    });
    await createCreative(lower.id, "campaign-priority-lower-creative");
    const higherCreative = await createCreative(
      higher.id,
      "campaign-priority-higher-creative",
    );
    await createAssignment(lower.id, slot.id);
    await createAssignment(higher.id, slot.id);

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: higher.id,
      creative: { id: higherCreative.id },
    });
  });

  it("uses Campaign createdAt DESC when priorities are equal", async () => {
    const slot = await createSlot("campaign-created-at-slot");
    const older = await createCampaign("campaign-created-at-older", {
      priority: 50,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const newer = await createCampaign("campaign-created-at-newer", {
      priority: 50,
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    await createCreative(older.id, "campaign-created-at-older-creative");
    const newerCreative = await createCreative(
      newer.id,
      "campaign-created-at-newer-creative",
    );
    await createAssignment(older.id, slot.id);
    await createAssignment(newer.id, slot.id);

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: newer.id,
      creative: { id: newerCreative.id },
    });
  });

  it("uses Campaign id ASC as the final Campaign tie-break", async () => {
    const slot = await createSlot("campaign-id-slot");
    const createdAt = new Date("2026-02-01T00:00:00.000Z");
    const firstId = prefix + "-campaign-tie-a-" + unique("id");
    const secondId = prefix + "-campaign-tie-b-" + unique("id");
    const first = await createCampaign("campaign-id-first", {
      id: firstId,
      priority: 50,
      createdAt,
    });
    const second = await createCampaign("campaign-id-second", {
      id: secondId,
      priority: 50,
      createdAt,
    });
    const firstCreative = await createCreative(
      first.id,
      "campaign-id-first-creative",
    );
    await createCreative(second.id, "campaign-id-second-creative");
    await createAssignment(first.id, slot.id);
    await createAssignment(second.id, slot.id);

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: first.id,
      creative: { id: firstCreative.id },
    });
  });

  it("uses Creative sortOrder ASC within the selected Campaign", async () => {
    const slot = await createSlot("creative-sort-order-slot");
    const campaign = await createCampaign("creative-sort-order-campaign");
    await createCreative(campaign.id, "creative-sort-order-later", {
      sortOrder: 20,
    });
    const firstCreative = await createCreative(
      campaign.id,
      "creative-sort-order-first",
      { sortOrder: 5 },
    );
    await createAssignment(campaign.id, slot.id);

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad.creative.id).toBe(firstCreative.id);
  });

  it("uses Creative createdAt DESC when sortOrder values are equal", async () => {
    const slot = await createSlot("creative-created-at-slot");
    const campaign = await createCampaign("creative-created-at-campaign");
    await createCreative(campaign.id, "creative-created-at-older", {
      sortOrder: 10,
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
    });
    const newerCreative = await createCreative(
      campaign.id,
      "creative-created-at-newer",
      {
        sortOrder: 10,
        createdAt: new Date("2026-03-02T00:00:00.000Z"),
      },
    );
    await createAssignment(campaign.id, slot.id);

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad.creative.id).toBe(newerCreative.id);
  });

  it("uses Creative id ASC as the final Creative tie-break", async () => {
    const slot = await createSlot("creative-id-slot");
    const campaign = await createCampaign("creative-id-campaign");
    const createdAt = new Date("2026-04-01T00:00:00.000Z");
    const firstId = prefix + "-creative-tie-a-" + unique("id");
    const secondId = prefix + "-creative-tie-b-" + unique("id");
    const firstCreative = await createCreative(
      campaign.id,
      "creative-id-first",
      {
        id: firstId,
        sortOrder: 10,
        createdAt,
      },
    );
    await createCreative(campaign.id, "creative-id-second", {
      id: secondId,
      sortOrder: 10,
      createdAt,
    });
    await createAssignment(campaign.id, slot.id);

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad.creative.id).toBe(firstCreative.id);
  });

  it("falls back when the highest-priority Campaign has no eligible Creative", async () => {
    const slot = await createSlot("creative-fallback-slot");
    const unavailable = await createCampaign("creative-fallback-high", {
      priority: 100,
    });
    const available = await createCampaign("creative-fallback-low", {
      priority: 10,
    });
    await createCreative(unavailable.id, "creative-fallback-inactive", {
      isActive: false,
    });
    const availableCreative = await createCreative(
      available.id,
      "creative-fallback-available",
    );
    await createAssignment(unavailable.id, slot.id);
    await createAssignment(available.id, slot.id);

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: available.id,
      creative: { id: availableCreative.id },
    });
  });

  it("returns the same Creative for repeated unchanged requests", async () => {
    const { slot, creative } = await createReadyAd("deterministic-repeat");

    const first = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);
    const second = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(first.body.ad.creative.id).toBe(creative.id);
    expect(second.body.ad.creative.id).toBe(creative.id);
    expect(second.body).toEqual(first.body);
  });

  it("returns ad=null when all Campaigns are ineligible", async () => {
    const slot = await createSlot("all-campaigns-ineligible-slot");
    const inactive = await createCampaign("all-campaigns-inactive", {
      isActive: false,
    });
    const future = await createCampaign("all-campaigns-future", {
      startsAt: new Date(Date.now() + 86_400_000),
      endsAt: new Date(Date.now() + 172_800_000),
    });
    await createCreative(inactive.id, "all-campaigns-inactive-creative");
    await createCreative(future.id, "all-campaigns-future-creative");
    await createAssignment(inactive.id, slot.id);
    await createAssignment(future.id, slot.id);

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toBeNull();
  });

  it("returns ad=null when all Creatives are ineligible", async () => {
    const slot = await createSlot("all-creatives-ineligible-slot");
    const campaign = await createCampaign("all-creatives-ineligible-campaign");
    await createCreative(campaign.id, "all-creatives-inactive", {
      isActive: false,
    });
    await createCreative(campaign.id, "all-creatives-deleted", {
      deletedAt: new Date(),
    });
    await createAssignment(campaign.id, slot.id);

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toBeNull();
  });

  it("returns the NONE target shape without additional target data", async () => {
    const { slot } = await createReadyAd("none-target");

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad.target).toEqual({
      type: AdTargetType.NONE,
      store: null,
      promotion: null,
      url: null,
    });
  });

  it("returns URL targetUrl without applying an optional Tenant lifecycle rule", async () => {
    const inactiveTenant = await createTenant("url-inactive-tenant", {
      isActive: false,
    });
    const targetUrl = "https://greenmall.test/offers/" + unique("url");
    const { slot, campaign } = await createReadyAd("url-target", {
      campaign: {
        tenantId: inactiveTenant.id,
        targetType: AdTargetType.URL,
        targetUrl,
      },
    });

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: campaign.id,
      target: {
        type: AdTargetType.URL,
        store: null,
        promotion: null,
        url: targetUrl,
      },
    });
  });

  it("returns a minimal public Store target when it is available", async () => {
    const tenant = await createTenant("valid-store-tenant");
    const store = await createStore("valid-store", tenant.id);
    const { slot, campaign } = await createReadyAd("valid-store-target", {
      campaign: {
        tenantId: tenant.id,
        targetType: AdTargetType.STORE,
        targetStoreId: store.id,
        priority: 100,
      },
    });

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: campaign.id,
      target: {
        type: AdTargetType.STORE,
        store: {
          id: store.id,
          slug: store.slug,
          name: store.name,
        },
        promotion: null,
        url: null,
      },
    });
    expect(Object.keys(response.body.ad.target.store).sort()).toEqual(
      ["id", "name", "slug"].sort(),
    );
  });

  it.each([
    [
      "inactive Store",
      "inactive-store",
      { storeActive: false, storeVisible: true, tenantActive: true },
    ],
    [
      "hidden Store",
      "hidden-store",
      { storeActive: true, storeVisible: false, tenantActive: true },
    ],
    [
      "inactive Store Tenant",
      "inactive-store-tenant",
      { storeActive: true, storeVisible: true, tenantActive: false },
    ],
  ] as const)(
    "falls back when a STORE target has an %s",
    async (_label, fixtureKey, state) => {
      const slot = await createSlot("store-fallback-" + fixtureKey);
      const tenant = await createTenant("store-fallback-tenant-" + fixtureKey, {
        isActive: state.tenantActive,
      });
      const store = await createStore(
        "store-fallback-target-" + fixtureKey,
        tenant.id,
        {
          isActive: state.storeActive,
          isVisible: state.storeVisible,
        },
      );
      const unavailable = await createCampaign(
        "store-fallback-unavailable-" + fixtureKey,
        {
          tenantId: tenant.id,
          targetType: AdTargetType.STORE,
          targetStoreId: store.id,
          priority: 100,
        },
      );
      const fallback = await createCampaign(
        "store-fallback-valid-" + fixtureKey,
        {
          priority: 10,
        },
      );
      await createCreative(
        unavailable.id,
        "store-fallback-unavailable-creative-" + fixtureKey,
      );
      const fallbackCreative = await createCreative(
        fallback.id,
        "store-fallback-valid-creative-" + fixtureKey,
      );
      await createAssignment(unavailable.id, slot.id);
      await createAssignment(fallback.id, slot.id);

      const response = await request(app.getHttpServer())
        .get(deliveryUrl(slot.code))
        .expect(200);

      expect(response.body.ad).toMatchObject({
        campaignId: fallback.id,
        creative: { id: fallbackCreative.id },
      });
    },
  );

  it("falls back when Campaign tenant ownership does not match the STORE target", async () => {
    const slot = await createSlot("store-tenant-mismatch-slot");
    const storeTenant = await createTenant("store-tenant-owner");
    const campaignTenant = await createTenant("store-tenant-mismatch");
    const store = await createStore(
      "store-tenant-mismatch-target",
      storeTenant.id,
    );
    const mismatched = await createCampaign("store-tenant-mismatch-campaign", {
      tenantId: campaignTenant.id,
      targetType: AdTargetType.STORE,
      targetStoreId: store.id,
      priority: 100,
    });
    const fallback = await createCampaign("store-tenant-mismatch-fallback", {
      priority: 10,
    });
    await createCreative(mismatched.id, "store-tenant-mismatch-creative");
    const fallbackCreative = await createCreative(
      fallback.id,
      "store-tenant-mismatch-fallback-creative",
    );
    await createAssignment(mismatched.id, slot.id);
    await createAssignment(fallback.id, slot.id);

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: fallback.id,
      creative: { id: fallbackCreative.id },
    });
  });

  it("returns a minimal Promotion target using public Promotion eligibility", async () => {
    const tenant = await createTenant("valid-promotion-tenant");
    const store = await createStore("valid-promotion-store", tenant.id);
    const promotion = await createPromotion(
      "valid-promotion",
      tenant.id,
      store.id,
    );
    const { slot, campaign } = await createReadyAd("valid-promotion-target", {
      campaign: {
        tenantId: tenant.id,
        targetType: AdTargetType.PROMOTION,
        targetPromotionId: promotion.id,
      },
    });

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: campaign.id,
      target: {
        type: AdTargetType.PROMOTION,
        store: null,
        promotion: {
          id: promotion.id,
          slug: promotion.slug,
          title: promotion.title,
        },
        url: null,
      },
    });
    expect(Object.keys(response.body.ad.target.promotion).sort()).toEqual(
      ["id", "slug", "title"].sort(),
    );
  });

  it("falls back when the target Promotion is not currently public", async () => {
    const slot = await createSlot("promotion-fallback-slot");
    const tenant = await createTenant("promotion-fallback-tenant");
    const store = await createStore("promotion-fallback-store", tenant.id);
    const futurePromotion = await createPromotion(
      "promotion-fallback-future",
      tenant.id,
      store.id,
      {
        startsAt: new Date(Date.now() + 86_400_000),
        endsAt: new Date(Date.now() + 172_800_000),
      },
    );
    const unavailable = await createCampaign("promotion-fallback-unavailable", {
      tenantId: tenant.id,
      targetType: AdTargetType.PROMOTION,
      targetPromotionId: futurePromotion.id,
      priority: 100,
    });
    const fallback = await createCampaign("promotion-fallback-valid", {
      priority: 10,
    });
    await createCreative(
      unavailable.id,
      "promotion-fallback-unavailable-creative",
    );
    const fallbackCreative = await createCreative(
      fallback.id,
      "promotion-fallback-valid-creative",
    );
    await createAssignment(unavailable.id, slot.id);
    await createAssignment(fallback.id, slot.id);

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: fallback.id,
      creative: { id: fallbackCreative.id },
    });
  });

  it("falls back when Campaign tenant ownership does not match the Promotion target", async () => {
    const slot = await createSlot("promotion-tenant-mismatch-slot");
    const promotionTenant = await createTenant("promotion-tenant-owner");
    const campaignTenant = await createTenant("promotion-tenant-mismatch");
    const store = await createStore(
      "promotion-tenant-mismatch-store",
      promotionTenant.id,
    );
    const promotion = await createPromotion(
      "promotion-tenant-mismatch-target",
      promotionTenant.id,
      store.id,
    );
    const mismatched = await createCampaign(
      "promotion-tenant-mismatch-campaign",
      {
        tenantId: campaignTenant.id,
        targetType: AdTargetType.PROMOTION,
        targetPromotionId: promotion.id,
        priority: 100,
      },
    );
    const fallback = await createCampaign(
      "promotion-tenant-mismatch-fallback",
      { priority: 10 },
    );
    await createCreative(mismatched.id, "promotion-tenant-mismatch-creative");
    const fallbackCreative = await createCreative(
      fallback.id,
      "promotion-tenant-mismatch-fallback-creative",
    );
    await createAssignment(mismatched.id, slot.id);
    await createAssignment(fallback.id, slot.id);

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: fallback.id,
      creative: { id: fallbackCreative.id },
    });
  });

  it("returns only the approved public delivery projection", async () => {
    const { slot, campaign, creative, assignment } = await createReadyAd(
      "response-safety",
      {
        campaign: {
          priority: 999,
          impressionLimit: 1,
          createdById: null,
          updatedById: null,
        },
        creative: {
          sortOrder: 77,
          createdById: null,
          updatedById: null,
        },
        assignment: {
          createdById: null,
          updatedById: null,
        },
      },
    );

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);
    const body = response.body;

    expect(Object.keys(body).sort()).toEqual(["ad", "slot"]);
    expect(Object.keys(body.slot).sort()).toEqual(["code", "placement"]);
    expect(Object.keys(body.ad).sort()).toEqual([
      "campaignId",
      "creative",
      "target",
    ]);
    expect(Object.keys(body.ad.creative).sort()).toEqual(
      ["id", "title", "description", "altText", "ctaText", "asset"].sort(),
    );
    expect(Object.keys(body.ad.creative.asset).sort()).toEqual(
      [
        "id",
        "filename",
        "originalName",
        "url",
        "mimeType",
        "size",
        "provider",
        "kind",
        "metadata",
        "createdAt",
        "updatedAt",
      ].sort(),
    );
    expect(Object.keys(body.ad.target).sort()).toEqual(
      ["type", "store", "promotion", "url"].sort(),
    );

    expect(body.ad.campaignId).toBe(campaign.id);
    expect(body.ad.creative.id).toBe(creative.id);
    expect(JSON.stringify(body)).not.toContain(assignment.id);
    for (const privateField of [
      "assignmentId",
      "panelId",
      "path",
      "uploadedById",
      "isActive",
      "deletedAt",
      "createdById",
      "updatedById",
      "priority",
      "impressionLimit",
      "startsAt",
      "endsAt",
      "sortOrder",
      "privateSlotData",
      "privateCampaignData",
      "privateCreativeData",
    ]) {
      expect(body).not.toHaveProperty(privateField);
      expect(JSON.stringify(body)).not.toContain('"' + privateField + '"');
    }
  });
  it("keeps an unlimited Campaign eligible after persisted impressions", async () => {
    const { slot, campaign, creative } = await createReadyAd(
      "impression-limit-unlimited",
      {
        campaign: { impressionLimit: null },
      },
    );
    await createAdvertisingEvent(
      campaign.id,
      AnalyticsEventType.AD_IMPRESSION,
      {
        adSlotId: slot.id,
        creativeId: creative.id,
      },
    );
    await createAdvertisingEvent(
      campaign.id,
      AnalyticsEventType.AD_IMPRESSION,
      {
        adSlotId: slot.id,
        creativeId: creative.id,
      },
    );

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: campaign.id,
      creative: { id: creative.id },
    });
  });

  it("keeps a Campaign eligible while impressions are below its limit", async () => {
    const { slot, campaign, creative } = await createReadyAd(
      "impression-limit-below",
      {
        campaign: { impressionLimit: 2 },
      },
    );
    await createAdvertisingEvent(
      campaign.id,
      AnalyticsEventType.AD_IMPRESSION,
      {
        adSlotId: slot.id,
        creativeId: creative.id,
      },
    );

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: campaign.id,
      creative: { id: creative.id },
    });
  });

  it("returns ad=null when a Campaign is exactly at its impression limit", async () => {
    const { slot, campaign, creative } = await createReadyAd(
      "impression-limit-exact",
      {
        campaign: { impressionLimit: 1 },
      },
    );
    await createAdvertisingEvent(
      campaign.id,
      AnalyticsEventType.AD_IMPRESSION,
      {
        source: AnalyticsSource.ADMIN,
        adSlotId: slot.id,
        creativeId: creative.id,
      },
    );

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toBeNull();
  });

  it("falls back to the next Campaign when the first quota is exhausted", async () => {
    const slot = await createSlot("impression-limit-fallback-slot");
    const exhausted = await createCampaign("impression-limit-fallback-high", {
      priority: 100,
      impressionLimit: 1,
    });
    const available = await createCampaign("impression-limit-fallback-low", {
      priority: 10,
      impressionLimit: 2,
    });
    const exhaustedCreative = await createCreative(
      exhausted.id,
      "impression-limit-fallback-high-creative",
    );
    const availableCreative = await createCreative(
      available.id,
      "impression-limit-fallback-low-creative",
    );
    await createAssignment(exhausted.id, slot.id);
    await createAssignment(available.id, slot.id);
    await createAdvertisingEvent(
      exhausted.id,
      AnalyticsEventType.AD_IMPRESSION,
      {
        adSlotId: slot.id,
        creativeId: exhaustedCreative.id,
      },
    );

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: available.id,
      creative: { id: availableCreative.id },
    });
  });

  it("does not consume impression quota with AD_CLICK events", async () => {
    const { slot, campaign, creative } = await createReadyAd(
      "impression-limit-click",
      {
        campaign: { impressionLimit: 1 },
      },
    );
    await createAdvertisingEvent(campaign.id, AnalyticsEventType.AD_CLICK, {
      adSlotId: slot.id,
      creativeId: creative.id,
    });

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: campaign.id,
      creative: { id: creative.id },
    });
  });

  it("does not consume quota twice for an idempotent impression replay", async () => {
    const { slot, campaign, creative } = await createReadyAd(
      "impression-limit-idempotency",
      {
        campaign: { impressionLimit: 2 },
      },
    );
    const eventBody = {
      clientEventId: prefix + "-quota-idempotency-" + unique("client-event-id"),
      type: AnalyticsEventType.AD_IMPRESSION,
      slotCode: slot.code,
      campaignId: campaign.id,
      creativeId: creative.id,
      source: AnalyticsSource.MOBILE,
    };

    const created = await request(app.getHttpServer())
      .post("/api/public/ads/events")
      .send(eventBody)
      .expect(201);
    const replayed = await request(app.getHttpServer())
      .post("/api/public/ads/events")
      .send(eventBody)
      .expect(200);

    expect(replayed.body).toEqual(created.body);
    expect(
      await prisma.analyticsEvent.count({
        where: { clientEventId: eventBody.clientEventId },
      }),
    ).toBe(1);

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toMatchObject({
      campaignId: campaign.id,
      creative: { id: creative.id },
    });
  });

  it("enforces one Campaign-global limit across Slots and Creatives", async () => {
    const firstSlot = await createSlot("impression-limit-global-first-slot");
    const secondSlot = await createSlot("impression-limit-global-second-slot");
    const campaign = await createCampaign("impression-limit-global-campaign", {
      impressionLimit: 1,
    });
    const firstCreative = await createCreative(
      campaign.id,
      "impression-limit-global-first-creative",
      { sortOrder: 0 },
    );
    await createCreative(
      campaign.id,
      "impression-limit-global-second-creative",
      {
        sortOrder: -1,
      },
    );
    await createAssignment(campaign.id, firstSlot.id);
    await createAssignment(campaign.id, secondSlot.id);
    await createAdvertisingEvent(
      campaign.id,
      AnalyticsEventType.AD_IMPRESSION,
      {
        source: AnalyticsSource.PANEL,
        adSlotId: firstSlot.id,
        creativeId: firstCreative.id,
      },
    );

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(secondSlot.code))
      .expect(200);

    expect(response.body.ad).toBeNull();
  });

  it("returns ad=null when every candidate has exhausted its quota", async () => {
    const slot = await createSlot("impression-limit-all-exhausted-slot");
    const first = await createCampaign("impression-limit-all-first", {
      priority: 100,
      impressionLimit: 1,
    });
    const second = await createCampaign("impression-limit-all-second", {
      priority: 10,
      impressionLimit: 1,
    });
    const firstCreative = await createCreative(
      first.id,
      "impression-limit-all-first-creative",
    );
    const secondCreative = await createCreative(
      second.id,
      "impression-limit-all-second-creative",
    );
    await createAssignment(first.id, slot.id);
    await createAssignment(second.id, slot.id);
    await createAdvertisingEvent(first.id, AnalyticsEventType.AD_IMPRESSION, {
      adSlotId: slot.id,
      creativeId: firstCreative.id,
    });
    await createAdvertisingEvent(second.id, AnalyticsEventType.AD_IMPRESSION, {
      adSlotId: slot.id,
      creativeId: secondCreative.id,
    });

    const response = await request(app.getHttpServer())
      .get(deliveryUrl(slot.code))
      .expect(200);

    expect(response.body.ad).toBeNull();
  });
});
