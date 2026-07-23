import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import { VariantTranslationDto } from './create-variant-group.dto';

export class VariantOptionUpdateDto {
  @ApiPropertyOptional({ description: 'Option identifier (omit for new options)', example: 'vopt-id' })
  id?: string;

  @ApiProperty({ description: 'Ordering weight', example: 0 })
  displayOrder!: number;

  @ApiProperty({ type: [VariantTranslationDto] })
  translations!: VariantTranslationDto[];
}

export class UpdateVariantGroupDto {
  @ApiPropertyOptional({ description: 'Display ordering weight', example: 0 })
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Active toggle status', example: true })
  isActive?: boolean;

  @ApiPropertyOptional({ type: [VariantTranslationDto] })
  translations?: VariantTranslationDto[];

  @ApiPropertyOptional({ type: [VariantOptionUpdateDto] })
  options?: VariantOptionUpdateDto[];
}

export const updateVariantGroupSchema = z.object({
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
});
