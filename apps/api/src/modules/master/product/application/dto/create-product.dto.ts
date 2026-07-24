import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus, ProductAvailability, SalesChannel } from '@/generated/client';
import { z } from 'zod';

export class ProductTranslationDto {
  @ApiProperty({ description: 'Language code', example: 'en' })
  locale!: string;

  @ApiProperty({ description: 'Product name', example: 'Espresso Romano' })
  name!: string;

  @ApiPropertyOptional({ description: 'Product description', example: 'Double shot espresso with lemon slice' })
  description?: string;
}

export class ProductScheduleDto {
  @ApiProperty({ description: 'Day of week (0 = Sunday, 6 = Saturday)', example: 1 })
  dayOfWeek!: number;

  @ApiProperty({ description: 'Start operational hour (HH:MM)', example: '08:00' })
  startTime!: string;

  @ApiProperty({ description: 'End operational hour (HH:MM)', example: '23:00' })
  endTime!: string;
}

export class ProductNutritionDto {
  @ApiPropertyOptional({ description: 'Calories amount', example: 120 })
  calories?: number;

  @ApiPropertyOptional({ description: 'Protein weight (g)', example: 2.5 })
  protein?: number;

  @ApiPropertyOptional({ description: 'Fat weight (g)', example: 4.2 })
  fat?: number;

  @ApiPropertyOptional({ description: 'Sugar weight (g)', example: 12.0 })
  sugar?: number;

  @ApiPropertyOptional({ description: 'Allergen list keywords', example: ['LACTOSE'] })
  allergens?: string[];
}

export class ProductAttributeDto {
  @ApiProperty({ description: 'Attribute name', example: 'Serving Size' })
  name!: string;

  @ApiProperty({ description: 'Attribute value', example: '250ml' })
  value!: string;
}

export class ProductMediaDto {
  @ApiProperty({ description: 'Media ID', example: 'media-cuid-123' })
  mediaId!: string;

  @ApiPropertyOptional({ description: 'Sorting order', example: 0 })
  sortOrder?: number;

  @ApiProperty({ description: 'Is primary layout cover photo', example: true })
  isPrimary!: boolean;
}

export class ProductVariantDto {
  @ApiProperty({ description: 'Variant Option ID', example: 'opt-cuid-123' })
  optionId!: string;

  @ApiProperty({ description: 'Price adjustment for this variant (can be positive or negative)', example: 5000, default: 0 })
  priceAdjustment!: number;

  @ApiPropertyOptional({ description: 'Optional unique SKU for this variant', example: 'TL-KOPI-SM' })
  sku?: string;
}

export class CreateProductDto {
  @ApiPropertyOptional({ description: 'Unique slug. Auto generated if blank.', example: 'espresso-romano' })
  slug?: string;

  @ApiPropertyOptional({ description: 'Auto generated standard SKU if empty.', example: 'TL-BEVERAGES-000001' })
  sku?: string;

  @ApiPropertyOptional({ description: 'UPC/EAN barcode scanner code', example: '012345678901' })
  barcode?: string;

  @ApiProperty({ description: 'Selling price decimal amount', example: 45.0 })
  sellingPrice!: number;

  @ApiPropertyOptional({ description: 'Availability toggle status', enum: ProductStatus, example: 'ACTIVE' })
  status?: ProductStatus;

  @ApiPropertyOptional({ description: 'Fulfillment availability status', enum: ProductAvailability, example: 'AVAILABLE' })
  availabilityStatus?: ProductAvailability;

  @ApiPropertyOptional({ description: 'Preparation time in minutes', example: 10 })
  preparationTime?: number;

  @ApiPropertyOptional({ description: 'Featured item toggle status', example: false })
  isFeatured?: boolean;

  @ApiProperty({ description: 'Product Category ID', example: 'cat-id-123' })
  categoryId!: string;

  @ApiPropertyOptional({ description: 'Target Kitchen Station IDs', example: ['station-id-coffee'] })
  stationIds?: string[];

  @ApiPropertyOptional({ description: 'Sales Channel visibility toggles', enum: SalesChannel, isArray: true, example: ['POS', 'QR_MENU'] })
  salesChannels?: SalesChannel[];

  @ApiPropertyOptional({ description: 'Product Availability Schedules list', type: [ProductScheduleDto] })
  availabilitySchedules?: ProductScheduleDto[];

  @ApiPropertyOptional({ description: 'Nutrition metadata', type: ProductNutritionDto })
  nutrition?: ProductNutritionDto;

  @ApiPropertyOptional({ description: 'Search tags list keywords', example: ['coffee', 'hot', 'citrus'] })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Dynamic specifications attributes', type: [ProductAttributeDto] })
  attributes?: ProductAttributeDto[];

  @ApiPropertyOptional({ description: 'Bound media references', type: [ProductMediaDto] })
  media?: ProductMediaDto[];

  @ApiPropertyOptional({ description: 'Product variant assignments', type: [ProductVariantDto] })
  variants?: ProductVariantDto[];

  @ApiPropertyOptional({ description: 'Associated modifier group IDs', example: ['group-id-123'] })
  modifierGroupIds?: string[];

  @ApiProperty({ description: 'Translations list containing localized names', type: [ProductTranslationDto] })
  translations!: ProductTranslationDto[];
}

export const createProductSchema = z.object({
  slug: z.string().min(1, 'Slug cannot be empty').optional(),
  sku: z.string().min(1, 'SKU cannot be empty').optional(),
  barcode: z.string().nullable().optional(),
  sellingPrice: z.number().positive('Price must be greater than zero'),
  status: z.nativeEnum(ProductStatus).optional(),
  availabilityStatus: z.nativeEnum(ProductAvailability).optional(),
  preparationTime: z.number().int().nonnegative().optional(),
  isFeatured: z.boolean().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  stationIds: z.array(z.string()).optional(),
  salesChannels: z.array(z.nativeEnum(SalesChannel)).optional(),
  availabilitySchedules: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format (HH:MM)'),
        endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format (HH:MM)'),
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
    .min(1, 'At least one translation is required'),
});
