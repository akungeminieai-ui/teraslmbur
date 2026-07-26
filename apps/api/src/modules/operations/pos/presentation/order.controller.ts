import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@/prisma/prisma.service';
import { SequenceService } from '../../../system/sequence/sequence.service';
import { OrderType, OrderStatus, TableStatus, KitchenTicketStatus, InventoryTxType } from '@/generated/client';
import { Decimal } from '@/generated/client/runtime/library';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orders')
export class OrderController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Process POS checkout transaction (MVP)' })
  async create(@Body() body: any, @CurrentUser() user: any) {
    const userId = user.id;
    const outletId = user.outletId || 'default-outlet';
    const enableTax = !!body.enableTax;

    return this.prisma.$transaction(async (tx) => {
      // 0. Active Shift Check
      const activeShift = await tx.shift.findFirst({
        where: {
          outletId,
          status: 'OPEN',
        },
      });
      if (!activeShift && body.skipShiftCheck !== true) {
        throw new BadRequestException('No active shift found. Please open a shift first.');
      }

      // 1. Customer Resolution
      let customerId: string | null = null;
      if (body.customerPhone) {
        let customer = await tx.customer.findUnique({
          where: { phone: body.customerPhone },
        });
        if (!customer) {
          customer = await tx.customer.create({
            data: {
              name: body.customerName || 'Customer',
              phone: body.customerPhone,
              address: body.customerAddress || null,
            },
          });
        } else if (body.customerAddress && !customer.address) {
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: { address: body.customerAddress },
          });
        }
        customerId = customer.id;
      } else if (body.customerName) {
        // Find by name
        let customer = await tx.customer.findFirst({
          where: { name: body.customerName },
        });
        if (!customer) {
          customer = await tx.customer.create({
            data: {
              name: body.customerName,
              address: body.customerAddress || null,
            },
          });
        }
        customerId = customer.id;
      }

      // 2. Table Validation & Session
      let tableSessionId: string | null = null;
      if (body.orderType === OrderType.DINE_IN) {
        if (!body.tableId) {
          throw new BadRequestException('Table selection is required for Dine In orders');
        }
        const table = await tx.table.findUnique({
          where: { id: body.tableId },
        });
        if (!table) {
          throw new NotFoundException('Table not found');
        }

        // Check if table already has an active session
        let activeSession = await tx.tableSession.findFirst({
          where: {
            tableId: table.id,
            status: 'ACTIVE',
          },
        });

        if (!activeSession) {
          // Update table status to OCCUPIED
          await tx.table.update({
            where: { id: table.id },
            data: { status: TableStatus.OCCUPIED },
          });

          // Create Table Session
          activeSession = await tx.tableSession.create({
            data: {
              tableId: table.id,
              customerId: customerId,
              status: 'ACTIVE',
            },
          });
        }
        tableSessionId = activeSession.id;
      }

      // 3. Stock Validation & Calculations
      const productIds = body.items.map((item: any) => item.productId);
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

      let orderSubtotal = new Decimal(0);
      const itemsToCreate = [];
      const inventoryTransactionsToCreate = [];
      const plannedDeductions = new Map<string, Decimal>();

      for (const item of body.items) {
        const product = productsMap.get(item.productId);
        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }
        if (product.status !== 'ACTIVE') {
          throw new BadRequestException(`Product ${product.slug} is not active`);
        }

        const basePrice = new Decimal(product.sellingPrice);
        let modifiersAdjustment = new Decimal(0);
        if (item.modifiers && Array.isArray(item.modifiers)) {
          for (const mod of item.modifiers) {
            modifiersAdjustment = modifiersAdjustment.add(new Decimal(mod.priceAdjustment || 0));
          }
        }

        const unitPrice = basePrice.add(modifiersAdjustment);
        const itemDiscount = new Decimal(item.discount || 0);
        const finalPrice = Decimal.max(0, unitPrice.sub(itemDiscount));
        const itemSubtotal = finalPrice.mul(new Decimal(item.quantity));
        orderSubtotal = orderSubtotal.add(itemSubtotal);

        itemsToCreate.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          subtotal: itemSubtotal,
          discount: itemDiscount,
          modifiers: item.modifiers || null,
          notes: item.notes || null,
        });

        // Ingredient Stock Deduction & Checks
        const recipe = product.recipes[0];
        if (recipe && recipe.items.length > 0) {
          for (const recipeItem of recipe.items) {
            const requiredQty = new Decimal(recipeItem.quantity).mul(new Decimal(item.quantity));
            const allowNegative = (body as any).strictStock !== true; // default true for smooth POS checkout

            if (!allowNegative) {
              const alreadyPlanned = plannedDeductions.get(recipeItem.ingredientId) || new Decimal(0);
              const stockAggregate = await tx.inventoryTransaction.aggregate({
                where: {
                  ingredientId: recipeItem.ingredientId,
                  outletId,
                },
                _sum: {
                  quantity: true,
                },
              });
              const currentStock = (stockAggregate._sum.quantity || new Decimal(0)).sub(alreadyPlanned);

              if (currentStock.lt(requiredQty)) {
                const ingredient = await tx.ingredient.findUnique({
                  where: { id: recipeItem.ingredientId },
                  include: { translations: true },
                });
                const ingName = ingredient?.translations.find((t) => t.locale === 'en')?.name || ingredient?.sku || 'Ingredient';
                throw new BadRequestException(`Insufficient stock for ingredient: ${ingName} (Required: ${requiredQty.toFixed(2)}, Available: ${currentStock.toFixed(2)})`);
              }
              plannedDeductions.set(recipeItem.ingredientId, alreadyPlanned.add(requiredQty));
            }

            const resolvedUnitId = recipeItem.unitId || 'default-unit';

            inventoryTransactionsToCreate.push({
              ingredientId: recipeItem.ingredientId,
              outletId,
              quantity: requiredQty.negated(), // negative for stock output
              unitId: resolvedUnitId,
              type: InventoryTxType.OUT,
              referenceType: 'ORDER',
              notes: `Order Checkout Deduction for ${product.slug}`,
            });
          }
        }
      }

      // Order totals
      const discountVal = new Decimal(body.discount || 0);
      const subtotalAfterDiscount = Decimal.max(0, orderSubtotal.sub(discountVal));
      const taxVal = enableTax ? subtotalAfterDiscount.mul(new Decimal(0.14)) : new Decimal(0);
      const totalVal = subtotalAfterDiscount.add(taxVal);

      // Check for duplicate checkouts by same user within 2 seconds
      const recentOrder = await tx.order.findFirst({
        where: {
          userId,
          outletId,
          total: totalVal,
          createdAt: { gte: new Date(Date.now() - 2000) },
        },
      });
      if (recentOrder) {
        throw new BadRequestException('Duplicate order submission detected. Please wait.');
      }

      // Generate custom Order Code: TL-DDMMYYYY-001 (sequence number on that day)
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const dateStr = `${dd}${mm}${yyyy}`;
      
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      const orderCountToday = await tx.order.count({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      });
      const orderIndexToday = orderCountToday + 1;
      const code = `TL-${dateStr}-${String(orderIndexToday).padStart(3, '0')}`;

      // Create Order
      const order = await tx.order.create({
        data: {
          code,
          type: body.orderType,
          status: body.isPaid === false ? OrderStatus.PENDING : OrderStatus.CONFIRMED, // PENDING represents unpaid order
          tableId: body.orderType === OrderType.DINE_IN ? body.tableId : null,
          customerId,
          tableSessionId,
          shiftId: activeShift ? activeShift.id : null,
          subtotal: orderSubtotal,
          discount: discountVal,
          tax: taxVal,
          total: totalVal,
          notes: body.notes || null,
          userId,
          outletId,
        },
      });

      // Transition Table status to OCCUPIED for Dine-in orders
      if (body.orderType === OrderType.DINE_IN && body.tableId) {
        await tx.table.update({
          where: { id: body.tableId },
          data: { status: 'OCCUPIED' },
        });
      }

      // Create Order Items
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

      // Deduct stock (insert transactions)
      await Promise.all(
        inventoryTransactionsToCreate.map((txData) => {
          return tx.inventoryTransaction.create({
            data: {
              ...txData,
              referenceId: order.id,
            },
          });
        }),
      );

      if (body.isPaid !== false) {
        const payMethodCode = (body.paymentMethod || 'CASH').toUpperCase();
        // Resolve or create payment method
        let paymentMethod = await tx.paymentMethod.findUnique({
          where: { code: payMethodCode },
        });
        if (!paymentMethod) {
          paymentMethod = await tx.paymentMethod.create({
            data: {
              code: payMethodCode,
              type: payMethodCode === 'CASH' ? 'CASH' : 'E_WALLET',
              isActive: true,
            },
          });
        }

        // Create Payment
        let refText = body.notes || null;
        if (body.paymentMethod === 'CASH') {
          refText = `Amount Received: ${body.amountReceived || totalVal.toNumber()}, Change: ${body.change || 0}`;
        } else {
          refText = `QRIS Status: ${body.qrisStatus || 'Paid'}`;
        }

        await tx.payment.create({
          data: {
            orderId: order.id,
            paymentMethodId: paymentMethod.id,
            amount: totalVal,
            reference: refText,
          },
        });
      }

      // Create Kitchen Ticket
      // Resolve first KitchenStation for the outlet or create default
      let station = await tx.kitchenStation.findFirst({
        where: { outletId },
      });
      if (!station) {
        station = await tx.kitchenStation.create({
          data: {
            outletId,
            code: 'KITCHEN',
            isActive: true,
          },
        });
      }

      const ticketItems = itemsToCreate.map((item) => {
        const product = productsMap.get(item.productId);
        const productName = product?.translations.find((t) => t.locale === 'en')?.name || product?.slug || 'Item';
        return {
          productId: item.productId,
          productName,
          quantity: item.quantity,
          notes: item.notes || '',
          modifiers: item.modifiers || [],
          isNew: false,
        };
      });

      await tx.kitchenTicket.create({
        data: {
          orderId: order.id,
          stationId: station.id,
          status: KitchenTicketStatus.PENDING,
          itemsState: ticketItems,
          isEdited: false,
        },
      });

      return order;
    }, { timeout: 30000, maxWait: 10000 });
  }

  @Get()
  @ApiOperation({ summary: 'Get list of orders with optional status filters' })
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: OrderStatus,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const size = pageSize ? parseInt(pageSize, 10) : 20;
    const skip = (pageNum - 1) * size;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
        include: {
          table: true,
          customer: true,
          tickets: true,
          payments: true,
          items: {
            include: {
              product: {
                include: {
                  translations: true,
                  category: {
                    include: { translations: true },
                  },
                  media: {
                    include: { media: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // Format for recent order list compatibility
    const formattedItems = items.map((o) => ({
      id: o.id,
      code: o.code,
      createdAt: o.createdAt.toISOString(),
      notes: o.notes,
      status: o.status,
      isPriority: o.tickets.some((t) => t.priority > 0),
      isPaid: o.payments.length > 0,
      items: o.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        quantity: i.quantity,
        productName: i.product.translations.find((t) => t.locale === 'en')?.name || i.product.slug,
        unitPrice: i.unitPrice.toNumber(),
        discount: i.discount.toNumber(),
        modifiers: i.modifiers,
        notes: i.notes,
        product: {
          id: i.product.id,
          name: i.product.translations.find((t) => t.locale === 'en')?.name || i.product.slug,
          sellingPrice: i.product.sellingPrice.toNumber(),
          category: i.product.category?.translations?.find((t) => t.locale === 'en')?.name || i.product.category?.slug || 'General',
          image: i.product.media?.[0]?.media?.fileUrl || null,
        }
      })),
      user: { name: 'Cashier' },
      tableNumber: o.table?.number || null,
      customerName: o.customer?.name || 'Walk-in',
      total: o.total.toNumber(),
    }));

    return { items: formattedItems, total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by ID' })
  async findOne(@Param('id') id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        table: true,
        customer: true,
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
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update order details / status / customer info / items' })
  async update(
    @Param('id') id: string,
    @Body() body: {
      status?: OrderStatus;
      customerName?: string;
      customerPhone?: string;
      tableId?: string;
      items?: any[];
      discount?: number;
      enableTax?: boolean;
    }
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const outletId = order.outletId;
      const updateData: any = {};
      if (body.status !== undefined) {
        updateData.status = body.status;
      }
      if (body.tableId !== undefined) {
        updateData.tableId = body.tableId || null;
      }

      // Resolve customer if customerName or customerPhone are provided
      let customerId: string | null = order.customerId;
      if (body.customerPhone) {
        let customer = await tx.customer.findFirst({
          where: { phone: body.customerPhone },
        });
        if (!customer) {
          customer = await tx.customer.create({
            data: {
              name: body.customerName || 'Walk-in',
              phone: body.customerPhone,
            },
          });
        }
        customerId = customer.id;
      } else if (body.customerName) {
        let customer = await tx.customer.findFirst({
          where: { name: body.customerName },
        });
        if (!customer) {
          customer = await tx.customer.create({
            data: {
              name: body.customerName,
            },
          });
        }
        customerId = customer.id;
      }

      if (customerId !== order.customerId) {
        updateData.customerId = customerId;
      }

      // If items are provided, rebuild items and recalculate totals
      if (body.items && Array.isArray(body.items)) {
        // Load original order items for item signature and KDS snapshot fallback comparisons
        const originalOrderItems = await tx.orderItem.findMany({
          where: { orderId: id },
          include: {
            product: {
              include: { translations: true },
            },
          },
        });

        // Remove existing items and inventory transactions first
        await tx.orderItem.deleteMany({
          where: { orderId: id },
        });
        await tx.inventoryTransaction.deleteMany({
          where: { referenceId: id },
        });

        // Stock Validation & Calculations
        const productIds = body.items.map((item: any) => item.productId);
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

        let orderSubtotal = new Decimal(0);
        const itemsToCreate = [];
        const inventoryTransactionsToCreate = [];
        const plannedDeductions = new Map<string, Decimal>();

        for (const item of body.items) {
          const product = productsMap.get(item.productId);
          if (!product) {
            throw new NotFoundException(`Product with ID ${item.productId} not found`);
          }
          if (product.status !== 'ACTIVE') {
            throw new BadRequestException(`Product ${product.slug} is not active`);
          }

          const basePrice = new Decimal(product.sellingPrice);
          let modifiersAdjustment = new Decimal(0);
          if (item.modifiers && Array.isArray(item.modifiers)) {
            for (const mod of item.modifiers) {
              modifiersAdjustment = modifiersAdjustment.add(new Decimal(mod.priceAdjustment || 0));
            }
          }

          const unitPrice = basePrice.add(modifiersAdjustment);
          const itemDiscount = new Decimal(item.discount || 0);
          const finalPrice = Decimal.max(0, unitPrice.sub(itemDiscount));
          const itemSubtotal = finalPrice.mul(new Decimal(item.quantity));
          orderSubtotal = orderSubtotal.add(itemSubtotal);

          itemsToCreate.push({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            subtotal: itemSubtotal,
            discount: itemDiscount,
            modifiers: item.modifiers || null,
            notes: item.notes || null,
          });

          // Ingredient Stock Deduction & Checks
          const recipe = product.recipes[0];
          if (recipe && recipe.items.length > 0) {
            for (const recipeItem of recipe.items) {
              const requiredQty = new Decimal(recipeItem.quantity).mul(new Decimal(item.quantity));
              const alreadyPlanned = plannedDeductions.get(recipeItem.ingredientId) || new Decimal(0);

              const stockAggregate = await tx.inventoryTransaction.aggregate({
                where: {
                  ingredientId: recipeItem.ingredientId,
                  outletId,
                },
                _sum: {
                  quantity: true,
                },
              });
              const currentStock = (stockAggregate._sum.quantity || new Decimal(0)).sub(alreadyPlanned);

              const allowNegative = (body as any).strictStock !== true;
              if (currentStock.lt(requiredQty) && !allowNegative) {
                const ingredient = await tx.ingredient.findUnique({
                  where: { id: recipeItem.ingredientId },
                  include: { translations: true },
                });
                const ingName = ingredient?.translations.find((t) => t.locale === 'en')?.name || ingredient?.sku || 'Ingredient';
                throw new BadRequestException(`Insufficient stock for ingredient: ${ingName}`);
              }

              const resolvedUnitId = recipeItem.unitId || await ingredientIdToUnitId(tx, recipeItem.ingredientId);

              plannedDeductions.set(recipeItem.ingredientId, alreadyPlanned.add(requiredQty));

              inventoryTransactionsToCreate.push({
                ingredientId: recipeItem.ingredientId,
                outletId,
                quantity: requiredQty.negated(),
                unitId: resolvedUnitId,
                type: InventoryTxType.OUT,
                referenceType: 'ORDER',
                notes: `Order Update Checkout Deduction for ${product.slug}`,
              });
            }
          }
        }

        // Write order items
        await Promise.all(
          itemsToCreate.map((item) =>
            tx.orderItem.create({
              data: {
                orderId: id,
                ...item,
              },
            }),
          ),
        );

        // Write inventory transactions
        await Promise.all(
          inventoryTransactionsToCreate.map((txData) => {
            return tx.inventoryTransaction.create({
              data: {
                ...txData,
                referenceId: id,
              },
            });
          }),
        );

        // Rebuild KDS ticket items state mapping
        const existingTicket = await tx.kitchenTicket.findFirst({
          where: { orderId: id },
        });

        if (existingTicket) {
          const getSignature = (productId: string, modifiers: any[], notes: string) => {
            const sortedMods = [...(modifiers || [])].sort((a, b) => {
              const optA = a?.optionId || '';
              const optB = b?.optionId || '';
              return optA.localeCompare(optB);
            });
            const modsStr = sortedMods.map((m) => m.optionId).join(',');
            return `${productId}-${modsStr}-${notes || ''}`;
          };

          let prevItemsState: any[] = [];
          if (existingTicket.itemsState && Array.isArray(existingTicket.itemsState)) {
            prevItemsState = existingTicket.itemsState;
          } else {
            // Fallback: construct snapshot from original order items before they were deleted
            prevItemsState = originalOrderItems.map((item) => {
              const trans = item.product.translations.find((t) => t.locale === 'en') || item.product.translations[0];
              return {
                productId: item.productId,
                productName: trans?.name || item.product.slug,
                quantity: item.quantity,
                notes: item.notes || '',
                modifiers: item.modifiers || [],
                isNew: false,
              };
            });
          }

          const prevQuantitiesBySignature = new Map<string, number>();
          for (const prev of prevItemsState) {
            const sig = getSignature(prev.productId, prev.modifiers || [], prev.notes || '');
            const currentSum = prevQuantitiesBySignature.get(sig) || 0;
            prevQuantitiesBySignature.set(sig, currentSum + prev.quantity);
          }

          const newItemsState: any[] = [];
          let hasNewItemsAdded = false;

          for (const item of itemsToCreate) {
            const sig = getSignature(item.productId, item.modifiers || [], item.notes || '');
            const prevQty = prevQuantitiesBySignature.get(sig) || 0;
            const newQty = item.quantity;

            const product = productsMap.get(item.productId);
            const productName = product?.translations.find((t) => t.locale === 'en')?.name || product?.slug || 'Item';

            if (newQty > prevQty) {
              hasNewItemsAdded = true;
              if (prevQty > 0) {
                newItemsState.push({
                  productId: item.productId,
                  productName,
                  quantity: prevQty,
                  notes: item.notes || '',
                  modifiers: item.modifiers || [],
                  isNew: false,
                });
                newItemsState.push({
                  productId: item.productId,
                  productName,
                  quantity: newQty - prevQty,
                  notes: item.notes || '',
                  modifiers: item.modifiers || [],
                  isNew: true,
                });
              } else {
                newItemsState.push({
                  productId: item.productId,
                  productName,
                  quantity: newQty,
                  notes: item.notes || '',
                  modifiers: item.modifiers || [],
                  isNew: true,
                });
              }
            } else {
              newItemsState.push({
                productId: item.productId,
                productName,
                quantity: newQty,
                notes: item.notes || '',
                modifiers: item.modifiers || [],
                isNew: false,
              });
            }
          }

          const ticketUpdateData: any = {
            itemsState: newItemsState,
          };

          if (hasNewItemsAdded) {
            ticketUpdateData.status = KitchenTicketStatus.PENDING;
            ticketUpdateData.isEdited = true;
            ticketUpdateData.startedAt = null;
            ticketUpdateData.completedAt = null;
          }

          await tx.kitchenTicket.update({
            where: { id: existingTicket.id },
            data: ticketUpdateData,
          });
        }

        // Update totals
        const discountVal = new Decimal(body.discount || 0);
        const subtotalAfterDiscount = Decimal.max(0, orderSubtotal.sub(discountVal));
        const taxVal = body.enableTax ? subtotalAfterDiscount.mul(new Decimal(0.14)) : new Decimal(0);
        const totalVal = subtotalAfterDiscount.add(taxVal);

        updateData.subtotal = orderSubtotal;
        updateData.discount = discountVal;
        updateData.tax = taxVal;
        updateData.total = totalVal;
      }

      // If table is updated, handle old vs new table status transitions
      if (body.tableId !== undefined && body.tableId !== order.tableId) {
        if (order.tableId) {
          // Release old table if no other active orders on it
          const otherOrdersCount = await tx.order.count({
            where: {
              tableId: order.tableId,
              status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.CLEAR] },
              id: { not: order.id },
            },
          });
          if (otherOrdersCount === 0) {
            await tx.table.update({
              where: { id: order.tableId },
              data: { status: TableStatus.AVAILABLE },
            });
          }
        }
        if (body.tableId) {
          // Set new table status to OCCUPIED
          await tx.table.update({
            where: { id: body.tableId },
            data: { status: TableStatus.OCCUPIED },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: updateData,
        include: {
          table: true,
          customer: true,
          items: {
            include: {
              product: {
                include: { translations: true },
              },
            },
          },
        },
      });
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an order (and restore stock / release table)' })
  async delete(@Param('id') id: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Find the order first
      const order = await tx.order.findUnique({
        where: { id },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // 2. Delete inventory transactions associated with the order (referenceId)
      await tx.inventoryTransaction.deleteMany({
        where: {
          referenceId: order.id,
        },
      });

      // 3. Delete the order (Prisma cascades to OrderItem, Payment, KitchenTicket)
      await tx.order.delete({
        where: { id },
      });

      // 4. Release Table if Dine In and no other active sessions remain
      if (order.tableId) {
        const otherOrdersCount = await tx.order.count({
          where: {
            tableId: order.tableId,
            status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.CLEAR] },
            id: { not: order.id },
          },
        });
        if (otherOrdersCount === 0) {
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: TableStatus.AVAILABLE },
          });
        }
      }

      return { success: true };
    });
  }

  @Patch(':id/priority')
  @ApiOperation({ summary: 'Toggle order kitchen priority status' })
  async togglePriority(
    @Param('id') id: string,
    @Body() body: { isPriority: boolean },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { tickets: true },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const nextPriority = body.isPriority ? 1 : 0;

      // Update all associated kitchen tickets priority
      await tx.kitchenTicket.updateMany({
        where: { orderId: order.id },
        data: { priority: nextPriority },
      });

      return { success: true, priority: nextPriority };
    });
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Settle payment for an existing pending order' })
  async settlePayment(
    @Param('id') id: string,
    @Body() body: {
      paymentMethod: string;
      amountReceived: number;
      change: number;
      qrisStatus?: string;
    }
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Resolve or create payment method
      let paymentMethod = await tx.paymentMethod.findUnique({
        where: { code: body.paymentMethod },
      });
      if (!paymentMethod) {
        paymentMethod = await tx.paymentMethod.create({
          data: {
            code: body.paymentMethod,
            type: body.paymentMethod === 'CASH' ? 'CASH' : 'E_WALLET',
            isActive: true,
          },
        });
      }

      // Create Payment record
      let refText = '';
      if (body.paymentMethod === 'CASH') {
        refText = `Amount Received: ${body.amountReceived}, Change: ${body.change || 0}`;
      } else {
        refText = `QRIS Status: ${body.qrisStatus || 'Paid'}`;
      }

      await tx.payment.create({
        data: {
          orderId: order.id,
          paymentMethodId: paymentMethod.id,
          amount: order.total,
          reference: refText,
        },
      });

      // If the kitchen ticket is already completed, release the table
      const ticket = await tx.kitchenTicket.findFirst({
        where: { orderId: order.id },
      });
      const isTicketCompleted = ticket ? ticket.status === KitchenTicketStatus.COMPLETED : true;

      if (isTicketCompleted && order.type === 'DINE_IN' && order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.CLEANING },
        });

        // Close Table Session
        const activeSession = await tx.tableSession.findFirst({
          where: {
            tableId: order.tableId,
            status: 'ACTIVE',
          },
        });
        if (activeSession) {
          await tx.tableSession.update({
            where: { id: activeSession.id },
            data: {
              status: 'COMPLETED',
              endedAt: new Date(),
            },
          });
        }
      }

      // Update order status to CLEAR if served, otherwise keep current prep status (since payment is recorded in Payment model)
      const finalStatus = isTicketCompleted ? OrderStatus.CLEAR : order.status;
      return tx.order.update({
        where: { id },
        data: { status: finalStatus },
      });
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
