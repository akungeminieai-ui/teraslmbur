import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export class CreateSaleItemDto {
  @ApiProperty({ description: 'Product ID', example: 'clxxx...' })
  productId!: string;

  @ApiProperty({ description: 'Quantity', example: 2 })
  quantity!: number;

  @ApiPropertyOptional({ description: 'Item level notes', example: 'Less sugar' })
  notes?: string;
}

export class CreateSaleDto {
  @ApiProperty({
    description: 'List of sale items',
    type: [CreateSaleItemDto],
  })
  items!: CreateSaleItemDto[];

  @ApiPropertyOptional({ description: 'Discount amount', example: 5.0, default: 0 })
  discount?: number;

  @ApiPropertyOptional({ description: 'Tax amount', example: 7.2, default: 0 })
  tax?: number;

  @ApiProperty({ description: 'Payment method', enum: ['CASH', 'QRIS'], example: 'CASH' })
  paymentMethod!: 'CASH' | 'QRIS';

  @ApiPropertyOptional({ description: 'General order notes', example: 'Order for Table 4' })
  notes?: string;
}

export const createSaleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        quantity: z.number().int().positive('Quantity must be greater than zero'),
        notes: z.string().nullable().optional(),
      }),
    )
    .min(1, 'At least one item is required'),
  discount: z.number().min(0, 'Discount cannot be negative').default(0),
  tax: z.number().min(0, 'Tax cannot be negative').default(0),
  paymentMethod: z.enum(['CASH', 'QRIS'], {
    errorMap: () => ({ message: 'Payment method must be CASH or QRIS' }),
  }),
  notes: z.string().nullable().optional(),
});
