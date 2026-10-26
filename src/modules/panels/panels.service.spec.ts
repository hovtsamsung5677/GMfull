import { NotFoundException } from "@nestjs/common";
import { PanelStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { PanelStatusBroadcasterService } from "./panel-status-broadcaster.service";
import { PanelsService } from "./panels.service";

describe("PanelsService.heartbeat", () => {
  const prisma = {
    panel: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const broadcaster = {
    publishPanelStatus: jest.fn(),
  } as unknown as PanelStatusBroadcasterService;

  const service = new PanelsService(
    prisma as unknown as PrismaService,
    broadcaster,
  );

  beforeEach(() => jest.clearAllMocks());

  it("throws NotFoundException when the panel does not exist", async () => {
    prisma.panel.findUnique.mockResolvedValue(null);

    await expect(service.heartbeat("missing", {})).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.panel.update).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the panel is inactive", async () => {
    prisma.panel.findUnique.mockResolvedValue({ id: "p1", isActive: false });

    await expect(service.heartbeat("p1", {})).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.panel.update).not.toHaveBeenCalled();
  });

  it("refreshes lastSeenAt, applies status/appVersion and broadcasts", async () => {
    const updated = {
      id: "p1",
      code: "panel-one",
      status: PanelStatus.ONLINE,
      lastSeenAt: new Date("2026-10-26T10:00:00.000Z"),
      usedAt: null,
      isActive: true,
    };
    prisma.panel.findUnique.mockResolvedValue({ id: "p1", isActive: true });
    prisma.panel.update.mockResolvedValue(updated);

    const before = Date.now();
    const result = await service.heartbeat("p1", {
      status: PanelStatus.ONLINE,
      appVersion: "1.2.3",
    });
    const after = Date.now();

    expect(prisma.panel.update).toHaveBeenCalledTimes(1);
    const call = prisma.panel.update.mock.calls[0] as unknown as Array<{
      where: { id: string };
      data: Record<string, unknown>;
      select: Record<string, boolean>;
    }>;
    expect(call[0].where).toEqual({ id: "p1" });
    expect(call[0].data.status).toBe(PanelStatus.ONLINE);
    expect(call[0].data.appVersion).toBe("1.2.3");
    const dataLastSeen = call[0].data.lastSeenAt as Date;
    expect(dataLastSeen).toBeInstanceOf(Date);
    expect(dataLastSeen.getTime()).toBeGreaterThanOrEqual(before);
    expect(dataLastSeen.getTime()).toBeLessThanOrEqual(after);
    expect(call[0].select).toEqual(
      expect.objectContaining({
        id: true,
        code: true,
        status: true,
        lastSeenAt: true,
        usedAt: true,
        isActive: true,
      }),
    );

    expect(broadcaster.publishPanelStatus).toHaveBeenCalledWith({
      id: "p1",
      code: "panel-one",
      status: PanelStatus.ONLINE,
      lastSeenAt: updated.lastSeenAt,
      usedAt: null,
      isActive: true,
    });

    expect(result.panel).toEqual({
      id: "p1",
      code: "panel-one",
      status: PanelStatus.ONLINE,
      lastSeenAt: updated.lastSeenAt,
      usedAt: null,
      isActive: true,
    });
    expect(result.processedAt).toBeInstanceOf(Date);
  });

  it("omits status/appVersion from the update payload when not supplied", async () => {
    const updated = {
      id: "p1",
      code: "panel-one",
      status: PanelStatus.OFFLINE,
      lastSeenAt: new Date("2026-10-26T10:00:00.000Z"),
      usedAt: null,
      isActive: true,
    };
    prisma.panel.findUnique.mockResolvedValue({ id: "p1", isActive: true });
    prisma.panel.update.mockResolvedValue(updated);

    await service.heartbeat("p1", {});

    const data = (
      prisma.panel.update.mock.calls[0] as Array<{
        data: Record<string, unknown>;
      }>
    )[0].data;
    expect(data.status).toBeUndefined();
    expect(data.appVersion).toBeUndefined();
    expect(data.lastSeenAt).toBeInstanceOf(Date);
  });
});
