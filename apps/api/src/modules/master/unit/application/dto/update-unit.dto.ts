import { ApiPropertyOptional } from '@nestjs/swagger';
import { UnitType } from '@prisma/client';
import { z } from 'zod';

export class UpdateUnitDto {
  @ApiPropertyOptional({ description: 'Name of the unit', example: 'Gram' })
  name?: string;

  @ApiPropertyOptional({ description: 'Abbreviation of the unit', example: 'g' })
  abbreviation?: string;

  @ApiPropertyOptional({ description: 'Type classification of the unit', enum: UnitType, example: 'WEIGHT' })
  type?: UnitType;
}

export const updateUnitSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  abbreviation: z.string().min(1, 'Abbreviation cannot be empty').optional(),
  type: z.nativeEnum(UnitType).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});
