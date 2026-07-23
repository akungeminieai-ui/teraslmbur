import { ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import { IngredientTranslationDto } from './create-ingredient.dto';

export class UpdateIngredientDto {
  @ApiPropertyOptional({ description: 'Ingredient SKU code', example: 'ING-001' })
  sku?: string;

  @ApiPropertyOptional({ description: 'Supplier reference code', example: 'SUP-GAR-01' })
  supplierReference?: string;

  @ApiPropertyOptional({ description: 'Inventory Unit ID', example: 'unit-id-g' })
  inventoryUnitId?: string;

  @ApiPropertyOptional({ description: 'Purchase Unit ID', example: 'unit-id-sack' })
  purchaseUnitId?: string;

  @ApiPropertyOptional({ description: 'Minimum stock alert threshold', example: 500 })
  minimumStock?: number;

  @ApiPropertyOptional({ description: 'Stock reorder warning level', example: 1000 })
  reorderLevel?: number;

  @ApiPropertyOptional({ description: 'Ideal par stock level', example: 5000 })
  idealStock?: number;

  @ApiPropertyOptional({ description: 'Conversion ratio multiplier', example: 25000 })
  conversionRatio?: number;

  @ApiPropertyOptional({ description: 'Current cost per inventory unit', example: 0.15 })
  costPerUnit?: number;

  @ApiPropertyOptional({ description: 'Active toggle status', example: true })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'General internal notes', example: 'Store in dry place' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Translations list updating name or description',
    type: [IngredientTranslationDto],
  })
  translations?: IngredientTranslationDto[];
}

export const updateIngredientSchema = z.object({
  sku: z.string().min(1, 'SKU cannot be empty').optional(),
  supplierReference: z.string().nullable().optional(),
  inventoryUnitId: z.string().min(1, 'Inventory Unit cannot be empty').optional(),
  purchaseUnitId: z.string().nullable().optional(),
  minimumStock: z.number().nonnegative().optional(),
  reorderLevel: z.number().nonnegative().optional(),
  idealStock: z.number().nonnegative().optional(),
  conversionRatio: z.number().positive('Conversion ratio must be greater than zero').optional(),
  costPerUnit: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  translations: z
    .array(
      z.object({
        locale: z.string().min(2, 'Locale must be at least 2 chars'),
        name: z.string().min(1, 'Name is required'),
        description: z.string().nullable().optional(),
      })
    )
    .optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});
