import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ModifierService } from '../application/modifier.service';
import { CreateModifierGroupDto, createModifierGroupSchema } from '../application/dto/create-modifier-group.dto';
import { UpdateModifierGroupDto, updateModifierGroupSchema } from '../application/dto/update-modifier-group.dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('Modifiers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('modifiers')
export class ModifierController {
  constructor(private readonly modifierService: ModifierService) {}

  @Post()
  @RequirePermissions('modifiers.create')
  @ApiOperation({ summary: 'Create a new modifier group template' })
  @ApiResponse({ status: 201, description: 'Modifier group successfully created' })
  async create(@Body(new ZodValidationPipe(createModifierGroupSchema)) dto: CreateModifierGroupDto) {
    return this.modifierService.create(dto);
  }

  @Get()
  @RequirePermissions('modifiers.read')
  @ApiOperation({ summary: 'Get paginated list of modifier groups' })
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
    return this.modifierService.findAll({
      search,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @RequirePermissions('modifiers.read')
  @ApiOperation({ summary: 'Get modifier group details by ID' })
  async findOne(@Param('id') id: string) {
    return this.modifierService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('modifiers.update')
  @ApiOperation({ summary: 'Update an existing modifier group template' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateModifierGroupSchema)) dto: UpdateModifierGroupDto,
  ) {
    return this.modifierService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('modifiers.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a modifier group' })
  async remove(@Param('id') id: string) {
    await this.modifierService.remove(id);
  }

  @Post(':id/duplicate')
  @RequirePermissions('modifiers.create')
  @ApiOperation({ summary: 'Duplicate an existing modifier group' })
  async duplicate(@Param('id') id: string) {
    return this.modifierService.duplicate(id);
  }
}
