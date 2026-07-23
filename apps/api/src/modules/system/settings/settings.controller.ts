import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Get public system branding & store settings' })
  async getPublicSettings(@Query('outletId') outletId?: string) {
    const data = await this.settingsService.getAll(outletId);
    // Filter only public settings
    const publicMap: Record<string, string> = {};
    data.definitions
      .filter((def) => def.isPublic)
      .forEach((def) => {
        publicMap[def.key] = def.value;
      });
    return publicMap;
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @Get()
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'Get all system configuration definitions and current values' })
  async getAllSettings(@Query('outletId') outletId?: string) {
    return this.settingsService.getAll(outletId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @Put()
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Update system settings values' })
  async updateSettings(
    @Body() settingsRecord: Record<string, string>,
    @Query('outletId') outletId?: string
  ) {
    return this.settingsService.updateMany(settingsRecord, outletId);
  }
}
