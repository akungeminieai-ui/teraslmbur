import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { UnitService } from '../application/unit.service';
import { CreateUnitDto, createUnitSchema } from '../application/dto/create-unit.dto';
import { UpdateUnitDto, updateUnitSchema } from '../application/dto/update-unit.dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('Units')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('units')
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Post()
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Create a new unit' })
  @ApiResponse({ status: 201, description: 'Unit successfully created' })
  async create(@Body(new ZodValidationPipe(createUnitSchema)) dto: CreateUnitDto) {
    return this.unitService.create(dto);
  }

  @Get()
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Get paginated list of units' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.unitService.findAll({
      search,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Get unit details by ID' })
  async findOne(@Param('id') id: string) {
    return this.unitService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Update an existing unit' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUnitSchema)) dto: UpdateUnitDto,
  ) {
    return this.unitService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('inventory.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a unit' })
  @ApiQuery({ name: 'reason', required: false, type: String })
  async remove(@Param('id') id: string, @Query('reason') reason?: string) {
    await this.unitService.remove(id, reason);
  }

  @Post(':id/duplicate')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Duplicate an existing unit' })
  async duplicate(@Param('id') id: string) {
    return this.unitService.duplicate(id);
  }
}
