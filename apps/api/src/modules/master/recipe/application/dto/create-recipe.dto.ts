import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export class RecipeItemDto {
  @ApiProperty({ description: 'Ingredient ID', example: 'clxxx...' })
  ingredientId!: string;

  @ApiProperty({ description: 'Quantity of ingredient', example: 0.02 })
  quantity!: number;

  @ApiPropertyOptional({ description: 'Override unit ID (defaults to ingredient inventory unit)', example: 'unit-id-kg' })
  unitId?: string;

  @ApiPropertyOptional({ description: 'Waste percentage (0-100)', example: 5.0 })
  wastePercentage?: number;

  @ApiPropertyOptional({ description: 'Line item notes', example: 'Use freshly ground' })
  notes?: string;
}

export class CreateRecipeDto {
  @ApiProperty({
    description: 'Recipe ingredient items',
    type: [RecipeItemDto],
  })
  items!: RecipeItemDto[];

  @ApiPropertyOptional({ description: 'Recipe notes', example: 'Standard recipe for a single serving' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Whether recipe is active', example: true, default: true })
  isActive?: boolean;
}

export const createRecipeSchema = z.object({
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
    ),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});
