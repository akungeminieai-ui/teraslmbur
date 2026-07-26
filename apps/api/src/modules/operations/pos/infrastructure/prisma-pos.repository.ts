import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IPosRepository, SaleWithItems } from '../domain/pos.repository.interface';
import { Decimal } from '@/generated/client/runtime/library';

const SALE_INCLUDE = {
  items: {
    include: {
      product: {
        include: {
          translations: true,
        },
      },
    },
  },
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

@Injectable()
export class PrismaPosRepository implements IPosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createSale(data: {
    outletId: string;
    userId: string;
    code: string;
    subtotal: number | string;
    discount: number | string;
    tax: number | string;
    total: number | string;
    paymentMethod: string;
    notes?: string | null;
    items: {
      productId: string;
      quantity: number;
      unitPrice: number | string;
      subtotal: number | string;
      hppSnapshot: number | string;
      notes?: string | null;
    }[];
  }): Promise<SaleWithItems> {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          code: data.code,
          outletId: data.outletId,
          userId: data.userId,
          subtotal: new Decimal(data.subtotal),
          discount: new Decimal(data.discount),
          tax: new Decimal(data.tax),
          total: new Decimal(data.total),
          paymentMethod: data.paymentMethod,
          notes: data.notes || null,
        },
      });

      await Promise.all(
        data.items.map((item) =>
          tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: new Decimal(item.unitPrice),
              subtotal: new Decimal(item.subtotal),
              hppSnapshot: new Decimal(item.hppSnapshot),
              notes: item.notes || null,
            },
          }),
        ),
      );

      return tx.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: SALE_INCLUDE,
      }) as unknown as SaleWithItems;
    });
  }

  async findById(id: string): Promise<SaleWithItems | null> {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: SALE_INCLUDE,
    });
    return sale as unknown as SaleWithItems | null;
  }

  async findAll(query?: {
    outletId?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: SaleWithItems[]; total: number }> {
    const page = query?.page || 1;
    const pageSize = query?.pageSize || 10;
    const skip = (page - 1) * pageSize;
    const sortBy = query?.sortBy || 'createdAt';
    const sortOrder = query?.sortOrder || 'desc';

    const where: any = {};
    if (query?.outletId) {
      where.outletId = query.outletId;
    }
    if (query?.userId) {
      where.userId = query.userId;
    }

    const [items, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: SALE_INCLUDE,
      }),
      this.prisma.sale.count({ where }),
    ]);

    return { items: items as unknown as SaleWithItems[], total };
  }
}
