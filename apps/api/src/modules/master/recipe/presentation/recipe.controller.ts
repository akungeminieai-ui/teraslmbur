import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { RecipeService } from '../application/recipe.service';
import { CreateRecipeDto, createRecipeSchema } from '../application/dto/create-recipe.dto';
import { UpdateRecipeDto, updateRecipeSchema } from '../application/dto/update-recipe.dto';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Recipes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @Get('recipes')
  @RequirePermissions('recipes.read')
  @ApiOperation({ summary: 'Get paginated list of recipes' })
  @ApiQuery({ name: 'productId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async findAll(
    @Query('productId') productId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.recipeService.findAll({
      productId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('recipes/:id')
  @RequirePermissions('recipes.read')
  @ApiOperation({ summary: 'Get recipe details by ID' })
  async findOne(@Param('id') id: string) {
    return this.recipeService.findOne(id);
  }

  @Get('products/:productId/recipe')
  @RequirePermissions('recipes.read')
  @ApiOperation({ summary: 'Get active recipe for a product' })
  async findActiveByProductId(@Param('productId') productId: string) {
    return this.recipeService.findActiveByProductId(productId);
  }

  @Post('products/:productId/recipe')
  @RequirePermissions('recipes.create')
  @ApiOperation({ summary: 'Create a new recipe for a product' })
  async create(
    @Param('productId') productId: string,
    @Body(new ZodValidationPipe(createRecipeSchema)) dto: CreateRecipeDto,
  ) {
    return this.recipeService.create(productId, dto);
  }

  @Put('recipes/:id')
  @RequirePermissions('recipes.update')
  @ApiOperation({ summary: 'Update an existing recipe' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRecipeSchema)) dto: UpdateRecipeDto,
  ) {
    return this.recipeService.update(id, dto);
  }

  @Delete('recipes/:id')
  @RequirePermissions('recipes.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a recipe' })
  async remove(@Param('id') id: string) {
    await this.recipeService.remove(id);
  }

  @Post('recipes/:id/activate')
  @RequirePermissions('recipes.update')
  @ApiOperation({ summary: 'Activate a specific recipe version' })
  async activate(@Param('id') id: string) {
    return this.recipeService.activate(id);
  }
}
