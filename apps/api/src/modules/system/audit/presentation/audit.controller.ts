import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from '../audit.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Audit')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('timeline')
  @ApiOperation({ summary: 'Get chronological audit timeline for a specific resource, newest first' })
  async getTimeline(
    @Query('resource') resource: string,
    @Query('resourceId') resourceId: string,
  ) {
    const timeline = await this.auditService.getTimeline(resource, resourceId);
    // Return newest first (descending order by createdAt)
    return [...timeline].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
