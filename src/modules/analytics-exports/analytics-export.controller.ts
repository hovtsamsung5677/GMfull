import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AdAnalyticsBreakdownItemResponseDto,
  AdAnalyticsBreakdownResponseDto,
} from '../analytics/dto/ad-analytics-response.dto';
import {
  AnalyticsExportFormat,
  AnalyticsExportNavigationQueryDto,
  AnalyticsExportAdsBreakdownQueryDto,
  ExportFormat,
} from './dto/analytics-export-query.dto';
import { AnalyticsExportService } from './analytics-export.service';
import { AdAnalyticsService } from '../analytics/ad-analytics.service';
import { NavigationAnalyticsService } from '../analytics/navigation-analytics.service';

const EXPORT_READ_ROLES = ['SUPER_ADMIN', 'MALL_ADMIN', 'ANALYTICS_VIEWER'];

@ApiTags('admin/analytics/export')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'JWT access token is missing or invalid.',
})
@ApiForbiddenResponse({
  description: 'Allowed roles: SUPER_ADMIN, MALL_ADMIN and ANALYTICS_VIEWER.',
})
@Controller('admin/analytics/export')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...EXPORT_READ_ROLES)
export class AnalyticsExportController {
  constructor(
    private readonly navigationAnalytics: NavigationAnalyticsService,
    private readonly adAnalytics: AdAnalyticsService,
    private readonly exportService: AnalyticsExportService,
  ) {}

  @Get('navigation/daily')
  @ApiOperation({
    summary: 'Export daily navigation activity series',
    description:
      'Exports the daily navigation report to CSV or XLSX. Accepts the same filters as the JSON daily report.',
  })
  @ApiQuery({ type: AnalyticsExportNavigationQueryDto })
  async exportDaily(
    @Query() query: AnalyticsExportNavigationQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const report = await this.navigationAnalytics.getDaily(query);
    const rows = report.items.map(item => ({
      date: item.date,
      panelClicks: item.panelClicks,
      routesBuilt: item.routesBuilt,
      qrScans: item.qrScans,
      sessions: item.sessions,
    }));

    await this.send(
      res,
      rows,
      [
        { key: 'date', header: 'Date' },
        { key: 'panelClicks', header: 'Panel Clicks' },
        { key: 'routesBuilt', header: 'Routes Built' },
        { key: 'qrScans', header: 'QR Scans' },
        { key: 'sessions', header: 'Sessions' },
      ],
      'navigation-daily',
      query.format,
    );
  }

  @Get('navigation/routes-by-store')
  @ApiOperation({
    summary: 'Export routes built grouped by destination store',
    description:
      'Exports the routes-by-store report to CSV or XLSX. Accepts the same filters as the JSON routes-by-store report.',
  })
  @ApiQuery({ type: AnalyticsExportNavigationQueryDto })
  async exportRoutesByStore(
    @Query() query: AnalyticsExportNavigationQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const report = await this.navigationAnalytics.getRoutesByStore(query);
    const rows = report.items.map(item => ({
      storeId: item.storeId,
      storeName: item.store?.name ?? '',
      storeSlug: item.store?.slug ?? '',
      floorNumber: item.store?.floorNumber ?? '',
      routesBuilt: item.routesBuilt,
    }));

    await this.send(
      res,
      rows,
      [
        { key: 'storeId', header: 'Store ID' },
        { key: 'storeName', header: 'Store Name' },
        { key: 'storeSlug', header: 'Store Slug' },
        { key: 'floorNumber', header: 'Floor Number' },
        { key: 'routesBuilt', header: 'Routes Built' },
      ],
      'navigation-routes-by-store',
      query.format,
    );
  }

  @Get('navigation/popular-categories')
  @ApiOperation({
    summary: 'Export popular categories by selection count',
    description: 'Exports the popular categories report to CSV or XLSX.',
  })
  @ApiQuery({ type: AnalyticsExportNavigationQueryDto })
  async exportPopularCategories(
    @Query() query: AnalyticsExportNavigationQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const report = await this.navigationAnalytics.getPopularCategories(query);
    const rows = report.items.map(item => ({
      categoryId: item.categoryId,
      categoryName: item.categoryName ?? '',
      categorySlug: item.categorySlug ?? '',
      categoryIsActive: item.categoryIsActive ?? '',
      selections: item.selections,
    }));

    await this.send(
      res,
      rows,
      [
        { key: 'categoryId', header: 'Category ID' },
        { key: 'categoryName', header: 'Category Name' },
        { key: 'categorySlug', header: 'Category Slug' },
        { key: 'categoryIsActive', header: 'Category Active' },
        { key: 'selections', header: 'Selections' },
      ],
      'navigation-popular-categories',
      query.format,
    );
  }

  @Get('navigation/search-queries')
  @ApiOperation({
    summary: 'Export search queries (optionally zero-result only)',
    description:
      'Exports the search queries report to CSV or XLSX. Accepts noResults and limit filters.',
  })
  @ApiQuery({ type: AnalyticsExportNavigationQueryDto })
  async exportSearchQueries(
    @Query() query: AnalyticsExportNavigationQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const report = await this.navigationAnalytics.getSearchQueries(query);
    const rows = report.items.map(item => ({
      query: item.query,
      count: item.count,
      noResults: item.noResults ? 'true' : 'false',
    }));

    await this.send(
      res,
      rows,
      [
        { key: 'query', header: 'Search Query' },
        { key: 'count', header: 'Count' },
        { key: 'noResults', header: 'No Results' },
      ],
      'navigation-search-queries',
      query.format,
    );
  }

  @Get('navigation/conversion/card-to-route')
  @ApiOperation({
    summary: 'Export card-view to route conversion funnel',
    description: 'Exports the card-to-route conversion funnel as a single-row report.',
  })
  @ApiQuery({ type: AnalyticsExportNavigationQueryDto })
  async exportCardToRouteConversion(
    @Query() query: AnalyticsExportNavigationQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const report = await this.navigationAnalytics.getCardToRouteConversion(query);
    const rows = [
      {
        cardViews: report.cardViews,
        routesFromCardSessions: report.routesFromCardSessions,
        conversionRate: report.conversionRate,
      },
    ];

    await this.send(
      res,
      rows,
      [
        { key: 'cardViews', header: 'Card Views' },
        { key: 'routesFromCardSessions', header: 'Routes From Card Sessions' },
        {
          key: 'conversionRate',
          header: 'Conversion Rate',
        },
      ],
      'navigation-conversion-card-to-route',
      query.format,
    );
  }

  @Get('ads/breakdown')
  @ApiOperation({
    summary: 'Export grouped advertising analytics',
    description: 'Exports the ads breakdown report to CSV or XLSX. Requires a groupBy parameter.',
  })
  @ApiQuery({ type: AnalyticsExportAdsBreakdownQueryDto })
  async exportAdsBreakdown(
    @Query() query: AnalyticsExportAdsBreakdownQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const report: AdAnalyticsBreakdownResponseDto = await this.adAnalytics.getBreakdown(query);
    const rows = report.items.map(item => this.toAdBreakdownRow(item));

    await this.send(
      res,
      rows,
      [
        { key: 'entityId', header: 'Entity ID' },
        { key: 'entityName', header: 'Entity Name' },
        { key: 'entityCode', header: 'Entity Code' },
        { key: 'entityPlacement', header: 'Entity Placement' },
        { key: 'entityCampaignId', header: 'Entity Campaign ID' },
        { key: 'impressions', header: 'Impressions' },
        { key: 'clicks', header: 'Clicks' },
        { key: 'ctr', header: 'CTR' },
      ],
      'ads-breakdown',
      query.format,
    );
  }

  private toAdBreakdownRow(item: AdAnalyticsBreakdownItemResponseDto): Record<string, unknown> {
    return {
      entityId: item.entityId,
      entityName: item.entity?.name ?? '',
      entityCode: item.entity?.code ?? '',
      entityPlacement: item.entity?.placement ?? '',
      entityCampaignId: item.entity?.campaignId ?? '',
      impressions: item.impressions,
      clicks: item.clicks,
      ctr: item.ctr,
    };
  }

  private async send(
    res: Response,
    rows: Array<Record<string, unknown>>,
    columns: Array<{ key: string; header: string }>,
    baseName: string,
    format: ExportFormat | undefined,
  ): Promise<void> {
    const resolvedFormat: ExportFormat = format ?? AnalyticsExportFormat.CSV;
    const extension = resolvedFormat === AnalyticsExportFormat.XLSX ? 'xlsx' : 'csv';
    const mimeType =
      resolvedFormat === AnalyticsExportFormat.XLSX
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv; charset=utf-8';

    const buffer = await this.exportService.exportToBuffer(rows, columns, resolvedFormat);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${baseName}.${extension}"`,
      'Content-Length': String(buffer.length),
    });
    res.send(buffer);
  }
}
