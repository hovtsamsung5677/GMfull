import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FileAssetKind, Prisma } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Promotions public API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const tenantIds: string[] = [];
  const storeIds: string[] = [];
  const assetIds: string[] = [];

  const runId = `${Date.now()}-${process.pid}`;
  const prefix = `promotions-public-e2e-${runId}`;
  const activeSlug = `${prefix}-active`;
  const generalSlug = `${prefix}-general`;
  const missingStoreSlug = `${prefix}-missing-store`;
  const missingTenantSlug = `${prefix}-missing-tenant`;
  const futureSlug = `${prefix}-future`;
  const expiredSlug = `${prefix}-expired`;
  const inactiveSlug = `${prefix}-inactive`;
  const deletedSlug = `${prefix}-deleted`;
  const hiddenStoreSlug = `${prefix}-hidden-store`;
  const inactiveStoreSlug = `${prefix}-inactive-store`;
  const inactiveTenantSlug = `${prefix}-inactive-tenant`;
  const boundaryEndedSlug = `${prefix}-boundary-ended`;
  const inactiveImageSlug = `${prefix}-inactive-image`;
  const modelImageSlug = `${prefix}-model-image`;
  const paginationSlug = `${prefix}-pagination`;

  let activeTenantId: string;
  let inactiveTenantId: string;
  let activeStoreId: string;
  let hiddenStoreId: string;
  let inactiveStoreId: string;
  let inactiveTenantStoreId: string;
  let activeImageAssetId: string;
  let inactiveImageAssetId: string;
  let modelAssetId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const activeTenant = await prisma.tenant.create({
      data: {
        name: `Promotions Public E2E Tenant ${runId}`,
        isActive: true,
      },
      select: { id: true },
    });
    activeTenantId = activeTenant.id;
    tenantIds.push(activeTenant.id);

    const inactiveTenant = await prisma.tenant.create({
      data: {
        name: `Promotions Public E2E Inactive Tenant ${runId}`,
        isActive: false,
      },
      select: { id: true },
    });
    inactiveTenantId = inactiveTenant.id;
    tenantIds.push(inactiveTenant.id);

    const activeStore = await prisma.store.create({
      data: {
        tenantId: activeTenantId,
        name: `Promotions Public E2E Store ${runId}`,
        slug: `${prefix}-active-store-record`,
        roomNumber: 'E2E-101',
        isActive: true,
        isVisible: true,
      },
      select: { id: true },
    });
    activeStoreId = activeStore.id;
    storeIds.push(activeStore.id);

    const hiddenStore = await prisma.store.create({
      data: {
        tenantId: activeTenantId,
        name: `Promotions Public E2E Hidden Store ${runId}`,
        slug: `${prefix}-hidden-store-record`,
        isActive: true,
        isVisible: false,
      },
      select: { id: true },
    });
    hiddenStoreId = hiddenStore.id;
    storeIds.push(hiddenStore.id);

    const inactiveStore = await prisma.store.create({
      data: {
        tenantId: activeTenantId,
        name: `Promotions Public E2E Inactive Store ${runId}`,
        slug: `${prefix}-inactive-store-record`,
        isActive: false,
        isVisible: true,
      },
      select: { id: true },
    });
    inactiveStoreId = inactiveStore.id;
    storeIds.push(inactiveStore.id);

    const inactiveTenantStore = await prisma.store.create({
      data: {
        tenantId: inactiveTenantId,
        name: `Promotions Public E2E Inactive Tenant Store ${runId}`,
        slug: `${prefix}-inactive-tenant-store-record`,
        roomNumber: 'E2E-104',
        isActive: true,
        isVisible: true,
      },
      select: { id: true },
    });
    inactiveTenantStoreId = inactiveTenantStore.id;
    storeIds.push(inactiveTenantStore.id);

    const activeImageAsset = await prisma.fileAsset.create({
      data: {
        filename: `${prefix}-active.jpg`,
        originalName: 'public-promotion.jpg',
        mimeType: 'image/jpeg',
        size: 8192,
        url: `https://example.test/${prefix}-active.jpg`,
        path: `private/${prefix}-active.jpg`,
        provider: 'public-e2e-provider',
        kind: FileAssetKind.IMAGE,
        isActive: true,
        metadata: { alt: 'Public promotion image' },
      },
      select: { id: true },
    });
    activeImageAssetId = activeImageAsset.id;
    assetIds.push(activeImageAsset.id);

    const inactiveImageAsset = await prisma.fileAsset.create({
      data: {
        filename: `${prefix}-inactive.jpg`,
        url: `https://example.test/${prefix}-inactive.jpg`,
        path: `private/${prefix}-inactive.jpg`,
        kind: FileAssetKind.IMAGE,
        isActive: false,
      },
      select: { id: true },
    });
    inactiveImageAssetId = inactiveImageAsset.id;
    assetIds.push(inactiveImageAsset.id);

    const modelAsset = await prisma.fileAsset.create({
      data: {
        filename: `${prefix}-model.glb`,
        url: `https://example.test/${prefix}-model.glb`,
        path: `private/${prefix}-model.glb`,
        kind: FileAssetKind.MODEL_3D,
        isActive: true,
      },
      select: { id: true },
    });
    modelAssetId = modelAsset.id;
    assetIds.push(modelAsset.id);

    const now = Date.now();
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const boundaryEnd = new Date();
    const oneHourAhead = new Date(now + 60 * 60 * 1000);
    const twoHoursAhead = new Date(now + 2 * 60 * 60 * 1000);

    const promotions: Prisma.PromotionCreateManyInput[] = [
      {
        title: `Current Promotion ${runId}`,
        slug: activeSlug,
        description: 'Currently public promotion.',
        terms: 'Public terms.',
        buttonText: 'Открыть',
        buttonUrl: '/public-e2e',
        tenantId: activeTenantId,
        storeId: activeStoreId,
        imageAssetId: activeImageAssetId,
        startsAt: oneHourAgo,
        endsAt: oneHourAhead,
        isActive: true,
        sortOrder: 10,
        metadata: { internalOnly: true },
      },
      {
        title: `General Promotion ${runId}`,
        slug: generalSlug,
        tenantId: null,
        storeId: null,
        startsAt: null,
        endsAt: null,
        isActive: true,
        sortOrder: 5,
      },
      {
        title: `Promotion Without Store ${runId}`,
        slug: missingStoreSlug,
        tenantId: activeTenantId,
        storeId: null,
        startsAt: oneHourAgo,
        endsAt: oneHourAhead,
        isActive: true,
        sortOrder: 6,
      },
      {
        title: `Promotion Without Tenant ${runId}`,
        slug: missingTenantSlug,
        tenantId: null,
        storeId: activeStoreId,
        startsAt: oneHourAgo,
        endsAt: oneHourAhead,
        isActive: true,
        sortOrder: 7,
      },
      {
        title: `Future Promotion ${runId}`,
        slug: futureSlug,
        tenantId: activeTenantId,
        storeId: activeStoreId,
        startsAt: oneHourAhead,
        endsAt: twoHoursAhead,
        isActive: true,
        sortOrder: 11,
      },
      {
        title: `Expired Promotion ${runId}`,
        slug: expiredSlug,
        tenantId: activeTenantId,
        storeId: activeStoreId,
        startsAt: twoHoursAgo,
        endsAt: oneHourAgo,
        isActive: true,
        sortOrder: 12,
      },
      {
        title: `Inactive Promotion ${runId}`,
        slug: inactiveSlug,
        tenantId: activeTenantId,
        storeId: activeStoreId,
        startsAt: oneHourAgo,
        endsAt: oneHourAhead,
        isActive: false,
        sortOrder: 13,
      },
      {
        title: `Deleted Promotion ${runId}`,
        slug: deletedSlug,
        tenantId: activeTenantId,
        storeId: activeStoreId,
        startsAt: oneHourAgo,
        endsAt: oneHourAhead,
        isActive: true,
        deletedAt: new Date(),
        sortOrder: 14,
      },
      {
        title: `Hidden Store Promotion ${runId}`,
        slug: hiddenStoreSlug,
        tenantId: activeTenantId,
        storeId: hiddenStoreId,
        startsAt: oneHourAgo,
        endsAt: oneHourAhead,
        isActive: true,
        sortOrder: 15,
      },
      {
        title: `Inactive Store Promotion ${runId}`,
        slug: inactiveStoreSlug,
        tenantId: activeTenantId,
        storeId: inactiveStoreId,
        startsAt: oneHourAgo,
        endsAt: oneHourAhead,
        isActive: true,
        sortOrder: 16,
      },
      {
        title: `Inactive Tenant Promotion ${runId}`,
        slug: inactiveTenantSlug,
        tenantId: inactiveTenantId,
        storeId: inactiveTenantStoreId,
        startsAt: oneHourAgo,
        endsAt: oneHourAhead,
        isActive: true,
        sortOrder: 17,
      },
      {
        title: `Boundary Ended Promotion ${runId}`,
        slug: boundaryEndedSlug,
        tenantId: activeTenantId,
        storeId: activeStoreId,
        startsAt: oneHourAgo,
        endsAt: boundaryEnd,
        isActive: true,
        sortOrder: 18,
      },
      {
        title: `Inactive Image Promotion ${runId}`,
        slug: inactiveImageSlug,
        tenantId: activeTenantId,
        storeId: activeStoreId,
        imageAssetId: inactiveImageAssetId,
        startsAt: oneHourAgo,
        endsAt: oneHourAhead,
        isActive: true,
        sortOrder: 20,
      },
      {
        title: `Model Image Promotion ${runId}`,
        slug: modelImageSlug,
        tenantId: activeTenantId,
        storeId: activeStoreId,
        imageAssetId: modelAssetId,
        startsAt: oneHourAgo,
        endsAt: oneHourAhead,
        isActive: true,
        sortOrder: 30,
      },
      {
        title: `Pagination Promotion ${runId}`,
        slug: paginationSlug,
        tenantId: activeTenantId,
        storeId: activeStoreId,
        startsAt: oneHourAgo,
        endsAt: oneHourAhead,
        isActive: true,
        sortOrder: 40,
      },
    ];

    await prisma.promotion.createMany({ data: promotions });
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.promotion.deleteMany({
          where: { slug: { startsWith: prefix } },
        });

        if (storeIds.length > 0) {
          await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
        }

        if (tenantIds.length > 0) {
          await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
        }

        if (assetIds.length > 0) {
          await prisma.fileAsset.deleteMany({
            where: { id: { in: assetIds } },
          });
        }
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it('is available without JWT and returns the current promotion', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/public/promotions')
      .query({ storeId: activeStoreId })
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: activeSlug })]),
    );
  });

  it('returns a current store promotion by slug', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/public/promotions/${activeSlug}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        slug: activeSlug,
        title: `Current Promotion ${runId}`,
        sortOrder: 10,
        store: expect.objectContaining({ id: activeStoreId }),
      }),
    );
  });

  it.each([
    ['store and tenant', generalSlug],
    ['store', missingStoreSlug],
    ['tenant', missingTenantSlug],
  ])('returns 404 when a promotion has no %s link', async (_case, slug) => {
    await request(app.getHttpServer())
      .get(`/api/public/promotions/${slug}`)
      .expect(404);
  });

  it('excludes promotions with missing required links from the list', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/public/promotions')
      .query({ page: 1, limit: 100 })
      .expect(200);

    const slugs = response.body.map(
      (promotion: { slug: string }) => promotion.slug,
    );

    expect(slugs).not.toEqual(
      expect.arrayContaining([generalSlug, missingStoreSlug, missingTenantSlug]),
    );
  });

  it.each([
    ['future', futureSlug],
    ['expired', expiredSlug],
    ['inactive', inactiveSlug],
    ['soft-deleted', deletedSlug],
    ['hidden-store', hiddenStoreSlug],
    ['inactive-store', inactiveStoreSlug],
    ['inactive-tenant', inactiveTenantSlug],
    ['endsAt-boundary', boundaryEndedSlug],
  ])('returns 404 for a non-public %s promotion', async (_case, slug) => {
    await request(app.getHttpServer())
      .get(`/api/public/promotions/${slug}`)
      .expect(404);
  });

  it('returns 404 for a nonexistent slug', async () => {
    await request(app.getHttpServer())
      .get(`/api/public/promotions/${prefix}-missing`)
      .expect(404);
  });

  it('filters the list by storeId and excludes unavailable promotions', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/public/promotions')
      .query({ storeId: activeStoreId, page: 1, limit: 100 })
      .expect(200);

    const slugs = response.body.map(
      (promotion: { slug: string }) => promotion.slug,
    );

    expect(slugs).toEqual(
      expect.arrayContaining([
        activeSlug,
        inactiveImageSlug,
        modelImageSlug,
        paginationSlug,
      ]),
    );
    expect(slugs).not.toEqual(
      expect.arrayContaining([
        generalSlug,
        missingTenantSlug,
        futureSlug,
        expiredSlug,
        inactiveSlug,
        deletedSlug,
        boundaryEndedSlug,
      ]),
    );
    expect(
      response.body.every(
        (promotion: { store: { id: string } }) =>
          promotion.store.id === activeStoreId,
      ),
    ).toBe(true);
  });

  it('returns only the safe public promotion and image fields', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/public/promotions/${activeSlug}`)
      .expect(200);

    expect(Object.keys(response.body).sort()).toEqual(
      [
        'id',
        'slug',
        'title',
        'description',
        'terms',
        'buttonText',
        'buttonUrl',
        'startsAt',
        'endsAt',
        'sortOrder',
        'store',
        'imageAsset',
      ].sort(),
    );
    expect(response.body).not.toHaveProperty('isActive');
    expect(response.body).not.toHaveProperty('deletedAt');
    expect(response.body).not.toHaveProperty('createdById');
    expect(response.body).not.toHaveProperty('updatedById');
    expect(response.body).not.toHaveProperty('metadata');

    expect(Object.keys(response.body.store).sort()).toEqual(
      ['id', 'name', 'slug', 'roomNumber'].sort(),
    );
    expect(response.body.store).not.toHaveProperty('isActive');
    expect(response.body.store).not.toHaveProperty('isVisible');

    expect(Object.keys(response.body.imageAsset).sort()).toEqual(
      [
        'id',
        'filename',
        'originalName',
        'mimeType',
        'size',
        'url',
        'kind',
        'metadata',
        'createdAt',
        'updatedAt',
      ].sort(),
    );
    expect(response.body.imageAsset.kind).toBe(FileAssetKind.IMAGE);
    expect(response.body.imageAsset).not.toHaveProperty('isActive');
    expect(response.body.imageAsset).not.toHaveProperty('path');
    expect(response.body.imageAsset).not.toHaveProperty('provider');
    expect(response.body.imageAsset).not.toHaveProperty('uploadedById');
    expect(
      Object.keys(response.body.imageAsset).some((field) =>
        field.endsWith('Count'),
      ),
    ).toBe(false);
  });

  it('keeps promotions public but hides inactive or non-image assets', async () => {
    const inactiveImageResponse = await request(app.getHttpServer())
      .get(`/api/public/promotions/${inactiveImageSlug}`)
      .expect(200);
    expect(inactiveImageResponse.body.imageAsset).toBeNull();

    const modelImageResponse = await request(app.getHttpServer())
      .get(`/api/public/promotions/${modelImageSlug}`)
      .expect(200);
    expect(modelImageResponse.body.imageAsset).toBeNull();
  });

  it('paginates current store promotions using page and limit', async () => {
    const firstPage = await request(app.getHttpServer())
      .get('/api/public/promotions')
      .query({ storeId: activeStoreId, page: 1, limit: 1 })
      .expect(200);
    const secondPage = await request(app.getHttpServer())
      .get('/api/public/promotions')
      .query({ storeId: activeStoreId, page: 2, limit: 1 })
      .expect(200);

    expect(firstPage.body).toHaveLength(1);
    expect(secondPage.body).toHaveLength(1);
    expect(firstPage.body[0].slug).toBe(activeSlug);
    expect(secondPage.body[0].slug).toBe(inactiveImageSlug);
  });
});
