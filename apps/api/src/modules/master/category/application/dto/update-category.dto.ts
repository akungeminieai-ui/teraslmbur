import { ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import { CategoryTranslationDto } from './create-category.dto';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category URL slug', example: 'beverages' })
  slug?: string;

  @ApiPropertyOptional({ description: 'Icon name or image URL', example: 'Coffee' })
  icon?: string;

  @ApiPropertyOptional({ description: 'Sorting order weight', example: 1 })
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Active toggle status', example: true })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Parent category ID for nesting', example: 'parent-id' })
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Translations array update',
    type: [CategoryTranslationDto],
  })
  translations?: CategoryTranslationDto[];
}

export const updateCategorySchema = z.object({
  slug: z.string().min(1, 'Slug cannot be empty').optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
  translations: z
    .array(
      z.object({
        locale: z.string().min(2, 'Locale must be at least 2 chars'),
        name: z.string().min(1, 'Name is required'),
      })
    )
    .optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});
