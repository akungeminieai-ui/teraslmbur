import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from '../application/analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions('analytics.read')
  @ApiOperation({ summary: 'Get aggregated stats for real-time dashboard screen' })
  async getDashboard(@Query('locale') locale?: string) {
    return this.analyticsService.getDashboardStats(locale || 'en');
  }

  @Get('reports')
  @RequirePermissions('analytics.read')
  @ApiOperation({ summary: 'Get financial reports breakdown data' })
  async getReports() {
    return this.analyticsService.getReportsData();
  }

  @Get('overview')
  @RequirePermissions('analytics.read')
  @ApiOperation({ summary: 'Get analytics overview performance indicators & hourly stats' })
  async getOverview(@Query('locale') locale?: string) {
    return this.analyticsService.getAnalyticsOverviewData(locale || 'en');
  }
}
