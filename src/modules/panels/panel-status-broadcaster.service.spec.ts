import { Logger } from "@nestjs/common";
import { Server } from "socket.io";
import { PanelStatusBroadcasterService } from "./panel-status-broadcaster.service";
import { PanelStatusPayload } from "./dto/panel-heartbeat.dto";

describe("PanelStatusBroadcasterService", () => {
  beforeEach(() => jest.restoreAllMocks());

  it("does not emit and does not throw when the server was not bound", () => {
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const service = new PanelStatusBroadcasterService();

    expect(() =>
      service.publishPanelStatus({
        id: "p1",
        code: "c",
        status: null,
        lastSeenAt: null,
        usedAt: null,
        isActive: true,
      } as unknown as PanelStatusPayload),
    ).not.toThrow();
  });

  it("publishes a panelStatusUpdated event on the bound server", () => {
    const service = new PanelStatusBroadcasterService();
    const emit = jest.fn();
    service.setServer({ emit } as unknown as Server);

    const payload: PanelStatusPayload = {
      id: "p1",
      code: "panel-1",
      status: "ONLINE" as never,
      lastSeenAt: new Date("2026-10-26T00:00:00.000Z"),
      usedAt: null,
      isActive: true,
    };

    service.publishPanelStatus(payload);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("panelStatusUpdated", payload);
  });
});
