import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaPosRepository } from '../infrastructure/prisma-pos.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { SequenceService } from '../../../system/sequence/sequence.service';
import { AuditService } from '../../../system/audit/audit.service';
import { EventBusService } from '../../../system/event-bus/event-bus.service';
import { BaseDomainEvent } from '../../../system/event-bus/base-domain-event';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleWithItems } from '../domain/pos.repository.interface';
import { Decimal } from '@/generated/client/runtime/library';

@Injectable()
export class PosService {
  constructor(
    private readonly posRepository: PrismaPosRepository,
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  async createSale(
    outletId: string,
    userId: string,
    dto: CreateSaleDto,
  ): Promise<SaleWithItems> {
    // 1. Validate all products exist and are active
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        deletedAt: null,
      },
    });

    if (products.length !== new Set(productIds).size) {
      const foundIds = new Set(products.map((p) => p.id));
      const missingIds = productIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Products not found: ${missingIds.join(', ')}`);
    }

    const inactiveProducts = products.filter((p) => p.status !== 'ACTIVE');
    if (inactiveProducts.length > 0) {
      throw new BadRequestException(
        `Inactive products cannot be sold: ${inactiveProducts.map((p) => p.slug).join(', ')}`,
      );
    }

    const productsMap = new Map(products.map((p) => [p.id, p]));

    // 2. Perform price verification & calculations
    let subtotal = new Decimal(0);
    const itemsData = dto.items.map((item) => {
      const product = productsMap.get(item.productId)!;
      const unitPrice = new Decimal(product.sellingPrice);
      if (unitPrice.lte(0)) {
        throw new BadRequestException(`Product '${product.slug}' does not have a valid selling price`);
      }

      const itemSubtotal = unitPrice.mul(new Decimal(item.quantity));
      subtotal = subtotal.add(itemSubtotal);

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: unitPrice.toNumber(),
        subtotal: itemSubtotal.toNumber(),
        hppSnapshot: new Decimal(product.currentHpp).toNumber(),
        notes: item.notes || null,
      };
    });

    const discount = new Decimal(dto.discount || 0);
    const tax = new Decimal(0); // Ignore any tax inputs, hardcoded to 0
    const total = subtotal.sub(discount);

    if (total.lt(0)) {
      throw new BadRequestException('Grand total cannot be negative');
    }

    // 3. Generate receipt code
    const code = await this.sequenceService.generate('receipt', outletId);

    // 4. Create Sale and items in transaction
    const sale = await this.posRepository.createSale({
      outletId,
      userId,
      code,
      subtotal: subtotal.toNumber(),
      discount: discount.toNumber(),
      tax: tax.toNumber(),
      total: total.toNumber(),
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      items: itemsData,
    });

    // 5. Write Audit Log
    await this.auditService.log({
      action: 'sale.create',
      resource: 'Sale',
      resourceId: sale.id,
      newValue: {
        id: sale.id,
        code: sale.code,
        total: sale.total.toString(),
        itemCount: sale.items.length,
      },
    });

    // 6. Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('sale.created', sale.id, 'Sale', {
        id: sale.id,
        code: sale.code,
        total: sale.total.toString(),
      }),
    );

    return sale;
  }

  async findSaleById(id: string): Promise<SaleWithItems> {
    const sale = await this.posRepository.findById(id);
    if (!sale) {
      throw new NotFoundException(`Sale transaction with ID '${id}' not found`);
    }
    return sale;
  }

  async findAllSales(
    outletId: string,
    query?: {
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ items: SaleWithItems[]; total: number }> {
    return this.posRepository.findAll({
      outletId,
      ...query,
    });
  }
}
