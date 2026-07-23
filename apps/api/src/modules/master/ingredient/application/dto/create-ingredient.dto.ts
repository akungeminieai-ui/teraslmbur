import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export class IngredientTranslationDto {
  @ApiProperty({ description: 'Language code', example: 'en' })
  locale!: string;

  @ApiProperty({ description: 'Ingredient localized name', example: 'Garlic Powder' })
  name!: string;

  @ApiPropertyOptional({ description: 'Optional translation of description/notes', example: 'Fine powder garlic' })
  description?: string;
}

export class CreateIngredientDto {
  @ApiPropertyOptional({ description: 'Auto-generated SKU if omitted', example: 'ING-001' })
  sku?: string;

  @ApiPropertyOptional({ description: 'Supplier reference code', example: 'SUP-GAR-01' })
  supplierReference?: string;

  @ApiProperty({ description: 'Inventory Unit ID (e.g. Grams)', example: 'unit-id-g' })
  inventoryUnitId!: string;

  @ApiPropertyOptional({ description: 'Purchase Unit ID (e.g. Sack)', example: 'unit-id-sack' })
  purchaseUnitId?: string;

  @ApiPropertyOptional({ description: 'Minimum stock alert threshold in inventory unit', example: 500 })
  minimumStock?: number;

  @ApiPropertyOptional({ description: 'Stock reorder warning level in inventory unit', example: 1000 })
  reorderLevel?: number;

  @ApiPropertyOptional({ description: 'Ideal par stock level in inventory unit', example: 5000 })
  idealStock?: number;

  @ApiPropertyOptional({ description: '1 Purchase Unit = X Inventory Units conversion ratio', example: 25000 })
  conversionRatio?: number;

  @ApiPropertyOptional({ description: 'Current cost per inventory unit', example: 0.15 })
  costPerUnit?: number;

  @ApiPropertyOptional({ description: 'Active toggle status', example: true })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'General internal notes', example: 'Store in dry place' })
  notes?: string;

  @ApiProperty({
    description: 'Translations list containing localized name and description',
    type: [IngredientTranslationDto],
  })
  translations!: IngredientTranslationDto[];
}

export const createIngredientSchema = z.object({
  sku: z.string().min(1, 'SKU cannot be empty').optional(),
  supplierReference: z.string().nullable().optional(),
  inventoryUnitId: z.string().min(1, 'Inventory Unit is required'),
  purchaseUnitId: z.string().nullable().optional(),
  minimumStock: z.number().nonnegative().optional(),
  reorderLevel: z.number().nonnegative().optional(),
  idealStock: z.number().nonnegative().optional(),
  conversionRatio: z.number().positive('Conversion ratio must be greater than zero').optional(),
  costPerUnit: z.number().nonnegative().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().nullable().optional(),
  translations: z
    .array(
      z.object({
        locale: z.string().min(2, 'Locale must be at least 2 chars'),
        name: z.string().min(1, 'Name is required'),
        description: z.string().nullable().optional(),
      })
    )
    .min(1, 'At least one translation is required'),
});
