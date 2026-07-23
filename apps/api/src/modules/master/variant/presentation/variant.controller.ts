import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { VariantService } from '../application/variant.service';
import { CreateVariantGroupDto, createVariantGroupSchema } from '../application/dto/create-variant-group.dto';
import { UpdateVariantGroupDto, updateVariantGroupSchema } from '../application/dto/update-variant-group.dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('Variants')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('variants')
export class VariantController {
  constructor(private readonly variantService: VariantService) {}

  @Post()
  @RequirePermissions('variants.create')
  @ApiOperation({ summary: 'Create a new variant group template' })
  @ApiResponse({ status: 201, description: 'Variant group successfully created' })
  async create(@Body(new ZodValidationPipe(createVariantGroupSchema)) dto: CreateVariantGroupDto) {
    return this.variantService.create(dto);
  }

  @Get()
  @RequirePermissions('variants.read')
  @ApiOperation({ summary: 'Get paginated list of variant groups' })
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
    return this.variantService.findAll({
      search,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @RequirePermissions('variants.read')
  @ApiOperation({ summary: 'Get variant group details by ID' })
  async findOne(@Param('id') id: string) {
    return this.variantService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('variants.update')
  @ApiOperation({ summary: 'Update an existing variant group template' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateVariantGroupSchema)) dto: UpdateVariantGroupDto,
  ) {
    return this.variantService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('variants.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a variant group' })
  async remove(@Param('id') id: string) {
    await this.variantService.remove(id);
  }

  @Post(':id/duplicate')
  @RequirePermissions('variants.create')
  @ApiOperation({ summary: 'Duplicate an existing variant group' })
  async duplicate(@Param('id') id: string) {
    return this.variantService.duplicate(id);
  }
}
