import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ProductService } from '../application/product.service';
import { CreateProductDto, createProductSchema } from '../application/dto/create-product.dto';
import { UpdateProductDto, updateProductSchema } from '../application/dto/update-product.dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductStatus, SalesChannel } from '@prisma/client';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @RequirePermissions('products.create')
  @ApiOperation({ summary: 'Create a new product' })
  async create(
    @Body(new ZodValidationPipe(createProductSchema)) dto: CreateProductDto,
    @CurrentUser('id') userId: string
  ) {
    return this.productService.create(dto, { id: userId });
  }

  @Get()
  @RequirePermissions('products.read')
  @ApiOperation({ summary: 'Get paginated list of products with filters' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'stationId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ProductStatus })
  @ApiQuery({ name: 'salesChannel', required: false, enum: SalesChannel })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('stationId') stationId?: string,
    @Query('status') status?: ProductStatus,
    @Query('salesChannel') salesChannel?: SalesChannel,
    @Query('isFeatured') isFeatured?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    return this.productService.findAll({
      search,
      categoryId,
      stationId,
      status,
      salesChannel,
      isFeatured: isFeatured === 'true' ? true : isFeatured === 'false' ? false : undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @RequirePermissions('products.read')
  @ApiOperation({ summary: 'Get product details by ID' })
  async findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions('products.update')
  @ApiOperation({ summary: 'Update an existing product' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) dto: UpdateProductDto,
    @CurrentUser('id') userId: string
  ) {
    return this.productService.update(id, dto, { id: userId });
  }

  @Delete(':id')
  @RequirePermissions('products.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a product' })
  @ApiQuery({ name: 'reason', required: false, type: String })
  async remove(
    @Param('id') id: string,
    @Query('reason') reason?: string,
    @CurrentUser('id') userId?: string
  ) {
    await this.productService.remove(id, reason, userId ? { id: userId } : undefined);
  }

  @Post(':id/restore')
  @RequirePermissions('products.update')
  @ApiOperation({ summary: 'Restore a soft-deleted product' })
  async restore(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.productService.restore(id, { id: userId });
  }

  @Post(':id/duplicate')
  @RequirePermissions('products.create')
  @ApiOperation({ summary: 'Duplicate an existing product' })
  async duplicate(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.productService.duplicate(id, { id: userId });
  }

  @Get(':id/price-history')
  @RequirePermissions('products.read')
  @ApiOperation({ summary: 'Get product price changes history timeline' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async findPriceHistory(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    return this.productService.findPriceHistory(id, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Post('bulk-status')
  @RequirePermissions('products.update')
  @ApiOperation({ summary: 'Bulk update status of multiple products' })
  async bulkUpdateStatus(
    @Body() body: { ids: string[]; status: ProductStatus },
    @CurrentUser('id') userId: string
  ) {
    await this.productService.bulkUpdateStatus(body.ids, body.status, { id: userId });
    return { success: true };
  }
}
