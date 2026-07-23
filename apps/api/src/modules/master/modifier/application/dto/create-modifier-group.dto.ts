import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export class ModifierTranslationDto {
  @ApiProperty({ description: 'Language code', example: 'en' })
  locale!: string;

  @ApiProperty({ description: 'Localized text value', example: 'Extra Cheese' })
  name!: string;
}

export class ModifierOptionCreateDto {
  @ApiProperty({ description: 'Price adjustment amount', example: 5.00 })
  priceAdjustment!: number;

  @ApiProperty({ description: 'Ordering weight', example: 0 })
  displayOrder!: number;

  @ApiProperty({ type: [ModifierTranslationDto] })
  translations!: ModifierTranslationDto[];
}

export class CreateModifierGroupDto {
  @ApiPropertyOptional({ description: 'Is selecting a modifier option required', example: false })
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'Minimum options to select', example: 0 })
  minSelect?: number;

  @ApiPropertyOptional({ description: 'Maximum options to select', example: 1 })
  maxSelect?: number;

  @ApiPropertyOptional({ description: 'Display ordering weight', example: 0 })
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Active toggle status', example: true })
  isActive?: boolean;

  @ApiProperty({ type: [ModifierTranslationDto] })
  translations!: ModifierTranslationDto[];

  @ApiProperty({ type: [ModifierOptionCreateDto] })
  options!: ModifierOptionCreateDto[];
}

export const createModifierGroupSchema = z.object({
  isRequired: z.boolean().default(false),
  minSelect: z.number().int().nonnegative().default(0),
  maxSelect: z.number().int().positive().default(1),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  translations: z
    .array(
      z.object({
        locale: z.string().min(2),
        name: z.string().min(1),
      })
    )
    .min(1, 'At least one translation is required'),
  options: z
    .array(
      z.object({
        priceAdjustment: z.number().nonnegative(),
        displayOrder: z.number().int().default(0),
        translations: z
          .array(
            z.object({
              locale: z.string().min(2),
              name: z.string().min(1),
            })
          )
          .min(1, 'At least one translation is required'),
      })
    )
    .min(1, 'At least one option is required'),
}).refine((data) => data.minSelect <= data.maxSelect, {
  message: 'minSelect cannot exceed maxSelect',
  path: ['minSelect'],
});
