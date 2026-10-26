import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AnalyticsExportController } from './analytics-export.controller';
import { AnalyticsExportService } from './analytics-export.service';

@Module({
  imports: [AnalyticsModule],
  controllers: [AnalyticsExportController],
  providers: [AnalyticsExportService],
})
export class AnalyticsExportsModule {}
