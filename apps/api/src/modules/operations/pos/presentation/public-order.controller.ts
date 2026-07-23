import { Controller, Get, Post, Patch, Body, Param, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, OrderType, OrderStatus, KitchenTicketStatus, InventoryTxType, TableStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@ApiTags('Public Order')
@Controller('public')
export class PublicOrderController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('menu')
  @ApiOperation({ summary: 'Get active menu products for customer self-ordering (no auth)' })
  async getPublicMenu(@Query('locale') localeQuery?: string) {
    const locale = localeQuery || 'id';

    // Fetch aggregated stocks for ingredients
    const txSums = await this.prisma.inventoryTransaction.groupBy({
      by: ['ingredientId'],
      _sum: { quantity: true },
    });
    const stockMap = new Map(txSums.map((tx) => [tx.ingredientId, tx._sum.quantity?.toNumber() || 0]));

    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        translations: true,
        category: {
          include: { translations: true },
        },
        media: {
          include: { media: true },
        },
        recipes: {
          where: { isActive: true, deletedAt: null },
          include: { items: true },
        },
        modifiers: {
          include: {
            group: {
              include: {
                translations: true,
                options: {
                  where: { isActive: true, deletedAt: null },
                  include: { translations: true },
                },
              },
            },
          },
        },
        variants: {
          where: { isActive: true, deletedAt: null },
          include: {
            option: {
              include: {
                group: {
                  include: { translations: true },
                },
                translations: true,
              },
            },
          },
        },
      },
    });

    return products.map((p) => {
      const nameTranslation = p.translations.find((t) => t.locale === locale) || p.translations[0];
      const descTranslation = p.translations.find((t) => t.locale === locale);
      const categoryTranslation = p.category.translations.find((t) => t.locale === locale) || p.category.translations[0];
      const primaryMedia = p.media.find((m) => m.isPrimary) || p.media[0];

      // Calculate recipe stock
      let productStock = Infinity;
      const recipe = p.recipes[0];
      if (recipe && recipe.items.length > 0) {
        for (const item of recipe.items) {
          const ingStock = stockMap.get(item.ingredientId) || 0;
          const reqQty = parseFloat(item.quantity.toString());
          if (reqQty > 0) {
            const possibleQty = ingStock / reqQty;
            if (possibleQty < productStock) {
              productStock = possibleQty;
            }
          }
        }
      } else {
        productStock = 999;
      }

      // Map modifiers
      const modifiers = p.modifiers.map((pm) => {
        const g = pm.group;
        const gNameTrans = g.translations.find((t) => t.locale === locale) || g.translations[0];
        return {
          id: g.id,
          name: gNameTrans?.name || g.id,
          isRequired: g.isRequired,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          options: g.options.map((opt) => {
            const optNameTrans = opt.translations.find((t) => t.locale === locale) || opt.translations[0];
            return {
              id: opt.id,
              name: optNameTrans?.name || opt.id,
              priceAdjustment: parseFloat(opt.priceAdjustment.toString()),
            };
          }),
        };
      });

      // Map variants as virtual modifier options
      const variantGroupsMap = new Map<string, {
        id: string;
        name: string;
        isRequired: boolean;
        minSelect: number;
        maxSelect: number;
        options: { id: string; name: string; priceAdjustment: number }[];
      }>();

      if ((p as any).variants && (p as any).variants.length > 0) {
        for (const pv of (p as any).variants) {
          const opt = pv.option;
          if (!opt) continue;
          const vg = opt.group;
          if (!vg) continue;
          const vgTr = vg.translations.find((t: any) => t.locale === locale) || vg.translations[0];
          const optTr = opt.translations.find((t: any) => t.locale === locale) || opt.translations[0];

          if (!variantGroupsMap.has(vg.id)) {
            variantGroupsMap.set(vg.id, {
              id: vg.id,
              name: vgTr?.name || vg.id,
              isRequired: true,
              minSelect: 1,
              maxSelect: 1,
              options: [],
            });
          }

          variantGroupsMap.get(vg.id)!.options.push({
            id: opt.id,
            name: optTr?.name || opt.id,
            priceAdjustment: parseFloat(pv.priceAdjustment.toString()),
          });
        }
      }

      const virtualModifiers = Array.from(variantGroupsMap.values());
      const allModifiers = [...virtualModifiers, ...modifiers];

      return {
        id: p.id,
        name: nameTranslation?.name || p.slug,
        description: descTranslation?.description || null,
        image: primaryMedia?.media?.fileUrl || null,
        sellingPrice: parseFloat(p.sellingPrice.toString()),
        category: categoryTranslation?.name || 'Uncategorized',
        categorySlug: p.category.slug,
        stock: productStock === Infinity ? 999 : Math.floor(productStock),
        modifiers: allModifiers,
        availabilityStatus: p.availabilityStatus,
      };
    });
  }

  @Get('tables')
  @ApiOperation({ summary: 'Get available tables for customer self-ordering (no auth)' })
  async getPublicTables() {
    const tables = await this.prisma.table.findMany({
      orderBy: { number: 'asc' },
    });
    return tables.map((t) => ({
      id: t.id,
      number: t.number,
      name: t.name,
      capacity: t.capacity,
      status: t.status,
      section: t.section,
    }));
  }

  @Get('orders/:code')
  @ApiOperation({ summary: 'Get order receipt details by order code (no auth)' })
  async getOrderByCode(@Param('code') code: string) {
    const order = await this.prisma.order.findUnique({
      where: { code },
      include: {
        customer: true,
        table: true,
        items: {
          include: {
            product: {
              include: { translations: true },
            },
          },
        },
        payments: {
          include: { method: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      id: order.id,
      code: order.code,
      type: order.type,
      status: order.status,
      tableId: order.tableId,
      tableNumber: order.table?.number || null,
      tableName: order.table?.name || null,
      customerName: order.customer?.name || 'Walk-in',
      subtotal: order.subtotal.toNumber(),
      discount: order.discount.toNumber(),
      tax: order.tax.toNumber(),
      total: order.total.toNumber(),
      isPaid: order.payments.length > 0 || order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CLEAR,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => {
        const trans = item.product.translations.find((t) => t.locale === 'id') || item.product.translations[0];
        return {
          id: item.id,
          productId: item.productId,
          productName: trans?.name || item.product.slug,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toNumber(),
          subtotal: item.subtotal.toNumber(),
          modifiers: item.modifiers,
          notes: item.notes,
        };
      }),
    };
  }

  @Post('orders')
  @ApiOperation({ summary: 'Submit customer self-order or append to existing active order (no auth)' })
  async submitSelfOrder(@Body() body: {
    customerName: string;
    orderType: 'DINE_IN' | 'TAKE_AWAY';
    tableId?: string;
    tableNumber?: number;
    existingOrderCode?: string;
    items: Array<{
      productId: string;
      quantity: number;
      modifiers?: any[];
      notes?: string;
    }>;
    notes?: string;
  }) {
    if (!body.items || body.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    const outletId = 'default-outlet';

    return this.prisma.$transaction(async (tx) => {
      // Resolve table if specified
      let resolvedTableId = body.tableId || null;
      let resolvedTableNumber = body.tableNumber || null;

      if (!resolvedTableId && resolvedTableNumber) {
        const tObj = await tx.table.findFirst({ where: { number: resolvedTableNumber } });
        if (tObj) resolvedTableId = tObj.id;
      } else if (resolvedTableId && !resolvedTableNumber) {
        const tObj = await tx.table.findUnique({ where: { id: resolvedTableId } });
        if (tObj) resolvedTableNumber = tObj.number;
      }

      // Load products & calculate item subtotals
      const productIds = body.items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: {
          translations: true,
          recipes: {
            where: { isActive: true, deletedAt: null },
            include: { items: true },
          },
        },
      });
      const productsMap = new Map(products.map((p) => [p.id, p]));

      let addedSubtotal = new Decimal(0);
      const itemsToCreate = [];

      for (const item of body.items) {
        const product = productsMap.get(item.productId);
        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }
        if (product.status !== 'ACTIVE') {
          throw new BadRequestException(`Product ${product.slug} is not available`);
        }

        const basePrice = new Decimal(product.sellingPrice);
        let modifiersAdjustment = new Decimal(0);
        if (item.modifiers && Array.isArray(item.modifiers)) {
          for (const mod of item.modifiers) {
            modifiersAdjustment = modifiersAdjustment.add(new Decimal(mod.priceAdjustment || 0));
          }
        }

        const unitPrice = basePrice.add(modifiersAdjustment);
        const itemSubtotal = unitPrice.mul(new Decimal(item.quantity));
        addedSubtotal = addedSubtotal.add(itemSubtotal);

        itemsToCreate.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          subtotal: itemSubtotal,
          discount: new Decimal(0),
          modifiers: (item.modifiers && item.modifiers.length > 0) ? item.modifiers as unknown as Prisma.InputJsonValue : Prisma.JsonNull,
          notes: item.notes || undefined,
        });
      }

      // Check if appending to existing active order
      let existingOrder = null;
      if (body.existingOrderCode) {
        existingOrder = await tx.order.findUnique({
          where: { code: body.existingOrderCode.trim() },
          include: { customer: true, table: true, items: true, tickets: true },
        });
        if (existingOrder && ([OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.CLEAR] as OrderStatus[]).includes(existingOrder.status)) {
          existingOrder = null; // Closed order, create new
        }
      }

      if (existingOrder) {
        // APPEND TO EXISTING ORDER
        const newSubtotal = existingOrder.subtotal.add(addedSubtotal);
        const newTotal = existingOrder.total.add(addedSubtotal);

        // Update table if newly provided
        const tableToUpdate = resolvedTableId || existingOrder.tableId;

        // Add items to order
        await Promise.all(
          itemsToCreate.map((item) =>
            tx.orderItem.create({
              data: {
                orderId: existingOrder.id,
                ...item,
              },
            }),
          ),
        );

        // If ticket exists, update itemsState or add ticket
        if (existingOrder.tickets.length > 0) {
          for (const ticket of existingOrder.tickets) {
            const currentItems = (ticket.itemsState && Array.isArray(ticket.itemsState)) ? (ticket.itemsState as any[]) : [];
            const newTicketItems = body.items.map((item) => {
              const p = productsMap.get(item.productId);
              const productName = p?.translations.find((t) => t.locale === 'id')?.name || p?.slug || 'Item';
              return {
                productId: item.productId,
                productName,
                quantity: item.quantity,
                notes: item.notes || '',
                modifiers: item.modifiers || [],
                isNew: true,
              };
            });

            await tx.kitchenTicket.update({
              where: { id: ticket.id },
              data: {
                itemsState: [...currentItems, ...newTicketItems],
                isEdited: true,
                status: KitchenTicketStatus.PENDING,
              },
            });
          }
        }

        // Update Order subtotal, total, and table
        const updated = await tx.order.update({
          where: { id: existingOrder.id },
          data: {
            subtotal: newSubtotal,
            total: newTotal,
            tableId: tableToUpdate || undefined,
          },
        });

        if (tableToUpdate) {
          await tx.table.update({
            where: { id: tableToUpdate },
            data: { status: TableStatus.OCCUPIED },
          });
        }

        // Count total items
        const allItemsCount = await tx.orderItem.count({ where: { orderId: existingOrder.id } });

        return {
          id: updated.id,
          code: updated.code,
          status: updated.status,
          total: updated.total.toNumber(),
          customerName: existingOrder.customer?.name || body.customerName.trim(),
          orderType: updated.type,
          tableId: tableToUpdate,
          tableNumber: resolvedTableNumber || existingOrder.table?.number || null,
          itemCount: allItemsCount,
          isAppended: true,
        };
      }

      // CREATE NEW ORDER
      if (!body.customerName || body.customerName.trim().length === 0) {
        throw new BadRequestException('Customer name is required');
      }

      // Resolve or create customer by name
      let customer = await tx.customer.findFirst({
        where: { name: body.customerName.trim() },
      });
      if (!customer) {
        customer = await tx.customer.create({
          data: { name: body.customerName.trim() },
        });
      }

      const totalVal = addedSubtotal;

      // Generate order code
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const dateStr = `${dd}${mm}${yyyy}`;

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const orderCountToday = await tx.order.count({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      });
      const orderIndexToday = orderCountToday + 1;
      const code = `TL-${dateStr}-${String(orderIndexToday).padStart(3, '0')}`;

      let systemUser = await tx.user.findFirst({
        where: { role: { name: 'OWNER' } },
      });
      if (!systemUser) {
        systemUser = await tx.user.findFirst();
      }
      const userId = systemUser?.id || 'system';

      const isDineIn = body.orderType === 'DINE_IN';
      const order = await tx.order.create({
        data: {
          code,
          type: body.orderType === 'TAKE_AWAY' ? OrderType.TAKE_AWAY : OrderType.DINE_IN,
          status: OrderStatus.PENDING,
          customerId: customer.id,
          tableId: isDineIn ? (resolvedTableId || undefined) : undefined,
          subtotal: addedSubtotal,
          discount: new Decimal(0),
          tax: new Decimal(0),
          total: totalVal,
          notes: body.notes || `Self-order via QR Menu`,
          userId,
          outletId,
        },
      });

      if (isDineIn && resolvedTableId) {
        await tx.table.update({
          where: { id: resolvedTableId },
          data: { status: TableStatus.OCCUPIED },
        });
      }

      await Promise.all(
        itemsToCreate.map((item) =>
          tx.orderItem.create({
            data: {
              orderId: order.id,
              ...item,
            },
          }),
        ),
      );

      return {
        id: order.id,
        code: order.code,
        status: order.status,
        total: order.total.toNumber(),
        customerName: body.customerName.trim(),
        orderType: order.type,
        tableId: resolvedTableId,
        tableNumber: resolvedTableNumber,
        itemCount: body.items.reduce((sum, i) => sum + i.quantity, 0),
        isAppended: false,
      };
    });
  }

  @Patch('orders/:id/confirm')
  @ApiOperation({ summary: 'Staff confirms a self-order — creates kitchen ticket and deducts stock' })
  async confirmSelfOrder(@Param('id') id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  translations: true,
                  recipes: {
                    where: { isActive: true, deletedAt: null },
                    include: { items: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const outletId = order.outletId;

      // Stock deduction
      const inventoryTransactionsToCreate = [];
      const plannedDeductions = new Map<string, Decimal>();

      for (const item of order.items) {
        const recipe = item.product.recipes[0];
        if (recipe && recipe.items.length > 0) {
          for (const recipeItem of recipe.items) {
            const requiredQty = new Decimal(recipeItem.quantity).mul(new Decimal(item.quantity));
            const alreadyPlanned = plannedDeductions.get(recipeItem.ingredientId) || new Decimal(0);

            const stockAggregate = await tx.inventoryTransaction.aggregate({
              where: {
                ingredientId: recipeItem.ingredientId,
                outletId,
              },
              _sum: { quantity: true },
            });
            const currentStock = (stockAggregate._sum.quantity || new Decimal(0)).sub(alreadyPlanned);

            if (currentStock.lt(requiredQty)) {
              const ingredient = await tx.ingredient.findUnique({
                where: { id: recipeItem.ingredientId },
                include: { translations: true },
              });
              const ingName = ingredient?.translations.find((t) => t.locale === 'en')?.name || ingredient?.sku || 'Ingredient';
              throw new BadRequestException(`Insufficient stock for ingredient: ${ingName}`);
            }

            const resolvedUnitId = recipeItem.unitId || (await ingredientIdToUnitId(tx, recipeItem.ingredientId));

            plannedDeductions.set(recipeItem.ingredientId, alreadyPlanned.add(requiredQty));

            inventoryTransactionsToCreate.push({
              ingredientId: recipeItem.ingredientId,
              outletId,
              quantity: requiredQty.negated(),
              unitId: resolvedUnitId,
              type: InventoryTxType.OUT,
              referenceType: 'ORDER',
              notes: `Self-Order Deduction for ${item.product.slug}`,
            });
          }
        }
      }

      // Deduct stock
      await Promise.all(
        inventoryTransactionsToCreate.map((txData) =>
          tx.inventoryTransaction.create({
            data: { ...txData, referenceId: order.id },
          }),
        ),
      );

      // Create Kitchen Ticket
      let station = await tx.kitchenStation.findFirst({ where: { outletId } });
      if (!station) {
        station = await tx.kitchenStation.create({
          data: { outletId, code: 'KITCHEN', isActive: true },
        });
      }

      const ticketItems = order.items.map((item) => {
        const productName = item.product.translations.find((t) => t.locale === 'en' || t.locale === 'id')?.name || item.product.slug;
        return {
          productId: item.productId,
          productName,
          quantity: item.quantity,
          notes: item.notes || '',
          modifiers: item.modifiers || [],
          isNew: false,
        };
      });

      // Check if kitchen ticket already exists for this order
      const existingTicket = await tx.kitchenTicket.findFirst({
        where: { orderId: order.id },
      });

      if (existingTicket) {
        await tx.kitchenTicket.update({
          where: { id: existingTicket.id },
          data: {
            status: KitchenTicketStatus.PENDING,
            itemsState: ticketItems,
            isEdited: true,
          },
        });
      } else {
        await tx.kitchenTicket.create({
          data: {
            orderId: order.id,
            stationId: station.id,
            status: KitchenTicketStatus.PENDING,
            itemsState: ticketItems,
            isEdited: false,
          },
        });
      }

      // Update order status to CONFIRMED
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: OrderStatus.CONFIRMED },
      });

      return {
        id: updatedOrder.id,
        code: updatedOrder.code,
        status: updatedOrder.status,
      };
    });
  }
}

// Helper function to resolve unitId from Ingredient
async function ingredientIdToUnitId(tx: any, ingredientId: string): Promise<string> {
  const ing = await tx.ingredient.findUnique({
    where: { id: ingredientId },
  });
  return ing?.inventoryUnitId || 'default-unit';
}
