import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import { ModifierTranslationDto } from './create-modifier-group.dto';

export class ModifierOptionUpdateDto {
  @ApiPropertyOptional({ description: 'Option identifier (omit for new options)', example: 'mopt-id' })
  id?: string;

  @ApiProperty({ description: 'Price adjustment amount', example: 5.00 })
  priceAdjustment!: number;

  @ApiProperty({ description: 'Ordering weight', example: 0 })
  displayOrder!: number;

  @ApiProperty({ type: [ModifierTranslationDto] })
  translations!: ModifierTranslationDto[];
}

export class UpdateModifierGroupDto {
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

  @ApiPropertyOptional({ type: [ModifierTranslationDto] })
  translations?: ModifierTranslationDto[];

  @ApiPropertyOptional({ type: [ModifierOptionUpdateDto] })
  options?: ModifierOptionUpdateDto[];
}

export const updateModifierGroupSchema = z.object({
  isRequired: z.boolean().optional(),
  minSelect: z.number().int().nonnegative().optional(),
  maxSelect: z.number().int().positive().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  translations: z
    .array(
      z.object({
        locale: z.string().min(2),
        name: z.string().min(1),
      })
    )
    .min(1)
    .optional(),
  options: z
    .array(
      z.object({
        id: z.string().optional(),
        priceAdjustment: z.number().nonnegative(),
        displayOrder: z.number().int().default(0),
        translations: z
          .array(
            z.object({
              locale: z.string().min(2),
              name: z.string().min(1),
            })
          )
          .min(1),
      })
    )
    .optional(),
}).refine((data) => {
  if (data.minSelect !== undefined && data.maxSelect !== undefined) {
    return data.minSelect <= data.maxSelect;
  }
  return true;
}, {
  message: 'minSelect cannot exceed maxSelect',
  path: ['minSelect'],
});
