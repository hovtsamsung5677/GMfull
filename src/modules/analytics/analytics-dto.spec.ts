import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PanelHeartbeatDto } from "../panels/dto/panel-heartbeat.dto";
import { PanelStatus } from "@prisma/client";
import {
  AnalyticsExportFormat,
  AnalyticsExportNavigationQueryDto,
  AnalyticsExportFormatQueryDto,
} from "../analytics-exports/dto/analytics-export-query.dto";
import { NavigationAnalyticsReportsQueryDto } from "../analytics/dto/navigation-analytics-query.dto";

describe("PanelHeartbeatDto validation", () => {
  it("accepts a status and trimmed appVersion", async () => {
    const dto = plainToInstance(PanelHeartbeatDto, {
      status: PanelStatus.ONLINE,
      appVersion: "  1.2.3  ",
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.status).toBe(PanelStatus.ONLINE);
    expect(dto.appVersion).toBe("1.2.3");
  });

  it("accepts an empty body (all fields optional)", async () => {
    const dto = plainToInstance(PanelHeartbeatDto, {});
    expect(await validate(dto)).toHaveLength(0);
  });

  it("rejects an unknown panel status", async () => {
    const dto = plainToInstance(PanelHeartbeatDto, {
      status: "FROBNICATED",
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects an appVersion exceeding 120 chars", async () => {
    const dto = plainToInstance(PanelHeartbeatDto, {
      appVersion: "x".repeat(121),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("AnalyticsExportFormat DTOs", () => {
  it("lowercases the format string and defaults to csv when missing", async () => {
    const dto = plainToInstance(AnalyticsExportFormatQueryDto, {
      format: "XLSX",
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.format).toBe(AnalyticsExportFormat.XLSX);

    const dto2 = plainToInstance(AnalyticsExportFormatQueryDto, {});
    expect(await validate(dto2)).toHaveLength(0);
    expect(dto2.format).toBeUndefined();
  });

  it("rejects an unsupported format", async () => {
    const dto = plainToInstance(AnalyticsExportFormatQueryDto, {
      format: "xml",
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("requires groupBy for the ads breakdown export query", async () => {
    const dto = plainToInstance(AnalyticsExportNavigationQueryDto, {});
    expect(await validate(dto)).toHaveLength(0);
  });
});

describe("NavigationAnalyticsReportsQueryDto", () => {
  it("parses noResults from stringy boolean forms", () => {
    const truthy = plainToInstance(NavigationAnalyticsReportsQueryDto, {
      noResults: "true",
    });
    const falsy = plainToInstance(NavigationAnalyticsReportsQueryDto, {
      noResults: "0",
    });
    expect(truthy.noResults).toBe(true);
    expect(falsy.noResults).toBe(false);
  });

  it("parses limit from a string", () => {
    const dto = plainToInstance(NavigationAnalyticsReportsQueryDto, {
      limit: "50",
    });
    expect(dto.limit).toBe(50);
  });

  it("rejects noResults values that are not boolean-like strings", async () => {
    const dto = plainToInstance(NavigationAnalyticsReportsQueryDto, {
      noResults: "maybe",
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects a limit outside the 1..1000 range", async () => {
    const dto = plainToInstance(NavigationAnalyticsReportsQueryDto, {
      limit: 0,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
