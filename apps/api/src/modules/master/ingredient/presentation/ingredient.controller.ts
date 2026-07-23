import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { IngredientService } from '../application/ingredient.service';
import { CreateIngredientDto, createIngredientSchema } from '../application/dto/create-ingredient.dto';
import { UpdateIngredientDto, updateIngredientSchema } from '../application/dto/update-ingredient.dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Ingredients')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ingredients')
export class IngredientController {
  constructor(private readonly ingredientService: IngredientService) {}

  @Post()
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Create a new ingredient' })
  async create(@Body(new ZodValidationPipe(createIngredientSchema)) dto: CreateIngredientDto) {
    return this.ingredientService.create(dto);
  }

  @Get()
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Get paginated list of ingredients' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('isActive') isActive?: string,
  ) {
    return this.ingredientService.findAll({
      search,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      sortBy,
      sortOrder,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Get ingredient details by ID' })
  async findOne(@Param('id') id: string) {
    return this.ingredientService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Update an existing ingredient' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateIngredientSchema)) dto: UpdateIngredientDto,
  ) {
    return this.ingredientService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('inventory.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an ingredient' })
  @ApiQuery({ name: 'reason', required: false, type: String })
  async remove(@Param('id') id: string, @Query('reason') reason?: string) {
    await this.ingredientService.remove(id, reason);
  }

  @Post(':id/duplicate')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Duplicate an existing ingredient' })
  async duplicate(@Param('id') id: string) {
    return this.ingredientService.duplicate(id);
  }

  @Post(':id/adjust')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Adjust stock level of an ingredient manually' })
  async adjust(
    @Param('id') id: string,
    @Body() body: { quantity: number; type: 'IN' | 'OUT' | 'SET'; notes?: string }
  ) {
    return this.ingredientService.adjust(id, body);
  }
}
