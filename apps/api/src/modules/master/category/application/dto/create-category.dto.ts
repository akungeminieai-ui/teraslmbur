import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export class CategoryTranslationDto {
  @ApiProperty({ description: 'Language code', example: 'en' })
  locale!: string;

  @ApiProperty({ description: 'Category localized name', example: 'Beverages' })
  name!: string;
}

export class CreateCategoryDto {
  @ApiPropertyOptional({ description: 'Unique category URL slug. Auto-generated if omitted.', example: 'beverages' })
  slug?: string;

  @ApiPropertyOptional({ description: 'Name of Lucide icon or image link', example: 'Coffee' })
  icon?: string;

  @ApiPropertyOptional({ description: 'Ordering weight for display lists', example: 1 })
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Active toggle status', example: true })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Parent category ID for hierarchical nesting (max 2 levels)', example: 'parent-id' })
  parentId?: string;

  @ApiProperty({
    description: 'Translations array, must include at least one translation (typically english)',
    type: [CategoryTranslationDto],
  })
  translations!: CategoryTranslationDto[];
}

export const createCategorySchema = z.object({
  slug: z.string().min(1, 'Slug cannot be empty').optional(),
  icon: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  parentId: z.string().nullable().optional(),
  translations: z
    .array(
      z.object({
        locale: z.string().min(2, 'Locale must be at least 2 chars'),
        name: z.string().min(1, 'Name is required'),
      })
    )
    .min(1, 'At least one translation is required'),
});
