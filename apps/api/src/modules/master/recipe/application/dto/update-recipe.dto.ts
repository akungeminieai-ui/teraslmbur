import { ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export class UpdateRecipeItemDto {
  @ApiPropertyOptional({ description: 'Ingredient ID', example: 'clxxx...' })
  ingredientId!: string;

  @ApiPropertyOptional({ description: 'Quantity of ingredient', example: 0.02 })
  quantity!: number;

  @ApiPropertyOptional({ description: 'Override unit ID', example: 'unit-id-kg' })
  unitId?: string;

  @ApiPropertyOptional({ description: 'Waste percentage (0-100)', example: 5.0 })
  wastePercentage?: number;

  @ApiPropertyOptional({ description: 'Line item notes', example: 'Use freshly ground' })
  notes?: string;
}

export class UpdateRecipeDto {
  @ApiPropertyOptional({
    description: 'Updated recipe ingredient items',
    type: [UpdateRecipeItemDto],
  })
  items?: UpdateRecipeItemDto[];

  @ApiPropertyOptional({ description: 'Recipe notes', example: 'Updated recipe' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Whether recipe is active', example: true })
  isActive?: boolean;
}

export const updateRecipeSchema = z.object({
  items: z
    .array(
      z.object({
        ingredientId: z.string().min(1, 'Ingredient ID is required'),
        quantity: z.number().positive('Quantity must be greater than zero'),
        unitId: z.string().nullable().optional(),
        wastePercentage: z.number().min(0).max(100).optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .min(1, 'At least one ingredient is required')
    .refine(
      (items) => {
        const ids = items.map((i) => i.ingredientId);
        return new Set(ids).size === ids.length;
      },
      { message: 'Duplicate ingredients are not allowed' },
    )
    .optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});
