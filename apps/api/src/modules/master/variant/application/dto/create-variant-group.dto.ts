import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export class VariantTranslationDto {
  @ApiProperty({ description: 'Language code', example: 'en' })
  locale!: string;

  @ApiProperty({ description: 'Localized text value', example: 'Size' })
  name!: string;
}

export class VariantOptionCreateDto {
  @ApiProperty({ description: 'Ordering weight', example: 0 })
  displayOrder!: number;

  @ApiProperty({ type: [VariantTranslationDto] })
  translations!: VariantTranslationDto[];
}

export class CreateVariantGroupDto {
  @ApiPropertyOptional({ description: 'Display ordering weight', example: 0 })
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Active toggle status', example: true })
  isActive?: boolean;

  @ApiProperty({ type: [VariantTranslationDto] })
  translations!: VariantTranslationDto[];

  @ApiProperty({ type: [VariantOptionCreateDto] })
  options!: VariantOptionCreateDto[];
}

export const createVariantGroupSchema = z.object({
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
});
