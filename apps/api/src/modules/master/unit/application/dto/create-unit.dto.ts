import { ApiProperty } from '@nestjs/swagger';
import { UnitType } from '@/generated/client';
import { z } from 'zod';

export class CreateUnitDto {
  @ApiProperty({ description: 'Name of the unit', example: 'Gram' })
  name!: string;

  @ApiProperty({ description: 'Abbreviation of the unit', example: 'g' })
  abbreviation!: string;

  @ApiProperty({ description: 'Type classification of the unit', enum: UnitType, example: 'WEIGHT' })
  type!: UnitType;
}

export const createUnitSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  abbreviation: z.string().min(1, 'Abbreviation is required'),
  type: z.nativeEnum(UnitType),
});
