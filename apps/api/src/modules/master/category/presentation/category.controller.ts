import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CategoryService } from '../application/category.service';
import { CreateCategoryDto, createCategorySchema } from '../application/dto/create-category.dto';
import { UpdateCategoryDto, updateCategorySchema } from '../application/dto/update-category.dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Categories')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @RequirePermissions('categories.create')
  @ApiOperation({ summary: 'Create a new product category' })
  async create(@Body(new ZodValidationPipe(createCategorySchema)) dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  @RequirePermissions('categories.read')
  @ApiOperation({ summary: 'Get paginated product categories' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'parentId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('parentId') parentId?: string,
    @Query('isActive') isActive?: string,
  ) {
    // If parentId is explicitly 'null', we filter by root categories (parentId = null)
    let parsedParentId: string | null | undefined = parentId;
    if (parentId === 'null') {
      parsedParentId = null;
    }

    return this.categoryService.findAll({
      search,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      sortBy,
      sortOrder,
      parentId: parsedParentId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('categories.read')
  @ApiOperation({ summary: 'Get category details by ID' })
  async findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('categories.update')
  @ApiOperation({ summary: 'Update an existing category' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('categories.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a category' })
  @ApiQuery({ name: 'reason', required: false, type: String })
  async remove(@Param('id') id: string, @Query('reason') reason?: string) {
    await this.categoryService.remove(id, reason);
  }

  @Post(':id/duplicate')
  @RequirePermissions('categories.create')
  @ApiOperation({ summary: 'Duplicate an existing category' })
  async duplicate(@Param('id') id: string) {
    return this.categoryService.duplicate(id);
  }
}
