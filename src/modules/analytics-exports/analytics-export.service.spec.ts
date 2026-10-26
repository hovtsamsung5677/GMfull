import { Readable } from "stream";
import ExcelJS from "exceljs";
import { AnalyticsExportFormat } from "./dto/analytics-export-query.dto";
import { AnalyticsExportService } from "./analytics-export.service";

describe("AnalyticsExportService", () => {
  let service: AnalyticsExportService;

  beforeEach(() => {
    service = new AnalyticsExportService();
  });

  const rows = [
    { categoryId: "c1", categoryName: "Coffee", selections: 10 },
    { categoryId: "c2", categoryName: "Shoes", selections: 5 },
  ];
  const columns = [
    { key: "categoryId", header: "Category ID" },
    { key: "categoryName", header: "Category Name" },
    { key: "selections", header: "Selections" },
  ];

  async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const stream = Readable.from([buffer]);
    await workbook.xlsx.read(stream);
    return workbook;
  }

  describe("exportToBuffer", () => {
    it("emits a CSV buffer by default when format is csv", async () => {
      const buffer = await service.exportToBuffer(
        rows,
        [...columns],
        AnalyticsExportFormat.CSV,
      );

      expect(Buffer.isBuffer(buffer)).toBe(true);
      const text = buffer.toString("utf-8");
      expect(text).toContain("Category ID");
      expect(text).toContain("Coffee");
      expect(text).toContain("c2");
    });

    it("emits an XLSX buffer", async () => {
      const buffer = await service.exportToBuffer(
        rows,
        [...columns],
        AnalyticsExportFormat.XLSX,
      );

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("emits an XLSX buffer whose header row carries the column headers", async () => {
      const buffer = await service.exportToBuffer(
        rows,
        [...columns],
        AnalyticsExportFormat.XLSX,
      );

      const workbook = await loadWorkbook(buffer);
      const worksheet = workbook.getWorksheet("Report")!;
      expect(worksheet.rowCount).toBe(rows.length + 1);
      expect(worksheet.getRow(1).values).toEqual([
        undefined,
        "Category ID",
        "Category Name",
        "Selections",
      ]);
    });

    it("writes a header row plus one row per record for xlsx", async () => {
      const buffer = await service.exportToBuffer(
        rows,
        [...columns],
        AnalyticsExportFormat.XLSX,
      );

      const workbook = await loadWorkbook(buffer);
      const worksheet = workbook.getWorksheet("Report")!;
      expect(worksheet.getRow(2).values).toEqual([
        undefined,
        "c1",
        "Coffee",
        10,
      ]);
    });

    it("serializes sparse rows into CSV", async () => {
      const sparseRows = [
        { a: "x", b: 3 },
        { a: undefined, b: null },
      ];
      const cols = [
        { key: "a", header: "A" },
        { key: "b", header: "B" },
      ];

      const buffer = await service.exportToBuffer(
        sparseRows,
        [...cols],
        AnalyticsExportFormat.CSV,
      );
      const text = buffer.toString("utf-8");
      expect(text).toContain("x,3");
    });

    it("honors an empty rows collection", async () => {
      const buffer = await service.exportToBuffer(
        [],
        [...columns],
        AnalyticsExportFormat.CSV,
      );
      const text = buffer.toString("utf-8");
      expect(text).toContain("Category ID");
    });

    it("exports xlsx when the format enum XLSX is used", async () => {
      const buffer = await service.exportToBuffer(
        rows,
        [...columns],
        AnalyticsExportFormat.XLSX,
      );
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });
  });
});
