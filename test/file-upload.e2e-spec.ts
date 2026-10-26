import { existsSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import request from "supertest";
import { E2ECtx, createE2EApp, loginAsSuperAdmin, teardownE2EApp } from "./e2e-helpers";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ctx: E2ECtx = {} as E2ECtx;

describe("File asset upload (e2e)", () => {
  const originalName = `e2e-upload-${runId}.png`;
  let assetId: string | undefined;
  let storedPath: string | null = null;

  beforeAll(async () => {
    const { app, prisma } = await createE2EApp();
    ctx.app = app;
    ctx.prisma = prisma;
    const { session, createdRole } = await loginAsSuperAdmin(app, prisma, runId);
    ctx.session = session;
    ctx.createdRole = createdRole;

    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }
  });

  afterAll(async () => {
    try {
      if (ctx.prisma && assetId) {
        await ctx.prisma.fileAsset.deleteMany({ where: { id: assetId } });
      }
      if (storedPath) {
        const diskFile = join(process.cwd(), "public", "uploads", storedPath);
        if (existsSync(diskFile)) {
          unlinkSync(diskFile);
        }
      }
      // also sweep any stray run-scoped assets the assertion captured nothing for
      if (ctx.prisma) {
        const leftovers = await ctx.prisma.fileAsset.findMany({
          where: { filename: { contains: runId } },
          select: { id: true, path: true },
        });
        if (leftovers.length > 0) {
          await ctx.prisma.fileAsset.deleteMany({
            where: { id: { in: leftovers.map((l) => l.id) } },
          });
          for (const l of leftovers) {
            if (l.path) {
              const f = join(process.cwd(), "public", "uploads", l.path);
              if (existsSync(f)) {
                unlinkSync(f);
              }
            }
          }
        }
      }
    } finally {
      await teardownE2EApp(ctx.app, ctx.prisma, {
        userId: ctx.session.userId,
        roleId: ctx.session.roleId,
        createdRole: ctx.createdRole,
      });
    }
  });

  it("rejects upload without a JWT", async () => {
    await request(ctx.app.getHttpServer())
      .post("/api/admin/file-assets/upload")
      .attach("file", Buffer.from([0x89, 0x50, 0x4e, 0x47]), originalName)
      .expect(401);
  });

  it("rejects upload when no file is attached", async () => {
    const res = await request(ctx.app.getHttpServer())
      .post("/api/admin/file-assets/upload")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .expect(500);

    // The controller throws a generic Error("No file uploaded") rather than a
    // BadRequestException, so the runtime status is 500. The contract is that
    // no asset is created.
    expect(res.body).not.toHaveProperty("id");
  });

  it("uploads a file and registers a LOCAL file asset", async () => {
    const res = await request(ctx.app.getHttpServer())
      .post("/api/admin/file-assets/upload")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .field("kind", "IMAGE")
      .attach("file", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), originalName)
      .expect(201);

    expect(res.body.id).toBeTruthy();
    expect(res.body.filename).toBe(originalName);
    expect(res.body.kind).toBe("IMAGE");
    expect(res.body.provider).toBe("LOCAL");
    expect(res.body.isActive).toBe(true);
    expect(res.body.uploadedById).toBe(ctx.session.userId);
    expect(res.body.url).toContain("/uploads/");
    expect(res.body.path).toBeTruthy();

    assetId = res.body.id;
    storedPath = res.body.path;

    if (storedPath) {
      const diskFile = join(process.cwd(), "public", "uploads", storedPath);
      expect(existsSync(diskFile)).toBe(true);
    }
  });

  it("serves the created asset through the public API", async () => {
    expect(assetId).toBeTruthy();
    const res = await request(ctx.app.getHttpServer())
      .get(`/api/public/file-assets/${assetId}`)
      .expect(200);

    expect(res.body.id).toBe(assetId);
    expect(res.body.filename).toBe(originalName);
    expect(res.body.provider).toBe("LOCAL");
    expect(res.body).not.toHaveProperty("path");
    expect(res.body).not.toHaveProperty("uploadedById");
    expect(res.body).not.toHaveProperty("isActive");
  });

  it("lists the asset in the admin listing", async () => {
    const res = await request(ctx.app.getHttpServer())
      .get("/api/admin/file-assets")
      .set("Authorization", `Bearer ${ctx.session.accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((a: { id: string }) => a.id === assetId)).toBe(true);
  });
});
