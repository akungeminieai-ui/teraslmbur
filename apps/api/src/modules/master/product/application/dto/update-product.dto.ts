import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus, ProductAvailability, SalesChannel } from '@/generated/client';
import { z } from 'zod';
import { ProductTranslationDto, ProductScheduleDto, ProductNutritionDto, ProductAttributeDto, ProductMediaDto, ProductVariantDto } from './create-product.dto';

export class UpdateProductDto {
  @ApiPropertyOptional({ description: 'Slug. Auto generated if blank.' })
  slug?: string;

  @ApiPropertyOptional({ description: 'SKU code' })
  sku?: string;

  @ApiPropertyOptional({ description: 'UPC/EAN barcode code' })
  barcode?: string;

  @ApiPropertyOptional({ description: 'Selling price decimal amount' })
  sellingPrice?: number;

  @ApiPropertyOptional({ description: 'Price change reason text explanation' })
  priceChangeReason?: string;

  @ApiPropertyOptional({ description: 'Product Lifecycle Status', enum: ProductStatus })
  status?: ProductStatus;

  @ApiPropertyOptional({ description: 'Fulfillment availability status', enum: ProductAvailability })
  availabilityStatus?: ProductAvailability;

  @ApiPropertyOptional({ description: 'Preparation time in minutes' })
  preparationTime?: number;

  @ApiPropertyOptional({ description: 'Featured item toggle status' })
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Product Category ID' })
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Target Kitchen Station IDs' })
  stationIds?: string[];

  @ApiPropertyOptional({ description: 'Sales Channel visibility toggles', enum: SalesChannel, isArray: true })
  salesChannels?: SalesChannel[];

  @ApiPropertyOptional({ description: 'Product Availability Schedules list', type: [ProductScheduleDto] })
  availabilitySchedules?: ProductScheduleDto[];

  @ApiPropertyOptional({ description: 'Nutrition metadata', type: ProductNutritionDto })
  nutrition?: ProductNutritionDto;

  @ApiPropertyOptional({ description: 'Search tags list keywords' })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Dynamic specifications attributes', type: [ProductAttributeDto] })
  attributes?: ProductAttributeDto[];

  @ApiPropertyOptional({ description: 'Bound media references', type: [ProductMediaDto] })
  media?: ProductMediaDto[];

  @ApiPropertyOptional({ description: 'Product variant assignments', type: [ProductVariantDto] })
  variants?: ProductVariantDto[];

  @ApiPropertyOptional({ description: 'Associated modifier group IDs', example: ['group-id-123'] })
  modifierGroupIds?: string[];

  @ApiPropertyOptional({ description: 'Translations list containing localized names', type: [ProductTranslationDto] })
  translations?: ProductTranslationDto[];
}

export const updateProductSchema = z.object({
  slug: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  barcode: z.string().nullable().optional(),
  sellingPrice: z.number().positive('Price must be greater than zero').optional(),
  priceChangeReason: z.string().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  availabilityStatus: z.nativeEnum(ProductAvailability).optional(),
  preparationTime: z.number().int().nonnegative().optional(),
  isFeatured: z.boolean().optional(),
  categoryId: z.string().optional(),
  stationIds: z.array(z.string()).optional(),
  salesChannels: z.array(z.nativeEnum(SalesChannel)).optional(),
  availabilitySchedules: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      })
    )
    .optional(),
  nutrition: z
    .object({
      calories: z.number().int().nonnegative().nullable().optional(),
      protein: z.number().nonnegative().nullable().optional(),
      fat: z.number().nonnegative().nullable().optional(),
      sugar: z.number().nonnegative().nullable().optional(),
      allergens: z.array(z.string()).optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  attributes: z
    .array(
      z.object({
        name: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .optional(),
  media: z
    .array(
      z.object({
        mediaId: z.string().min(1),
        sortOrder: z.number().int().default(0),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
  variants: z
    .array(
      z.object({
        optionId: z.string().min(1),
        priceAdjustment: z.number().default(0),
        sku: z.string().nullable().optional(),
      })
    )
    .optional(),
  modifierGroupIds: z.array(z.string()).optional(),
  translations: z
    .array(
      z.object({
        locale: z.string().min(2),
        name: z.string().min(1, 'Product name is required'),
        description: z.string().nullable().optional(),
      })
    )
    .optional(),
});
