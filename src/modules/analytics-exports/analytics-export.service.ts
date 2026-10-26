import ExcelJS from 'exceljs';
import { AnalyticsExportFormat, ExportFormat } from './dto/analytics-export-query.dto';

export interface ExportColumn {
  key: string;
  header: string;
}

export class AnalyticsExportService {
  async exportToBuffer(
    rows: Array<Record<string, unknown>>,
    columns: ExportColumn[],
    format: ExportFormat,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    worksheet.columns = columns.map(column => ({
      header: column.header,
      key: column.key,
    }));

    worksheet.addRows(rows);

    const buffer =
      format === AnalyticsExportFormat.XLSX
        ? await workbook.xlsx.writeBuffer()
        : await workbook.csv.writeBuffer();

    return buffer as unknown as Buffer;
  }
}
