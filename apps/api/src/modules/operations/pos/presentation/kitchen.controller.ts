import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@/prisma/prisma.service';
import { KitchenTicketStatus, OrderStatus, TableStatus } from '@/generated/client';

@ApiTags('Kitchen')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('kitchen/orders')
export class KitchenController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get active kitchen tickets' })
  async getTickets() {
    const tickets = await this.prisma.kitchenTicket.findMany({
      where: {
        status: { in: [KitchenTicketStatus.PENDING, KitchenTicketStatus.IN_PROGRESS, KitchenTicketStatus.COMPLETED] },
        order: {
          status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CLEAR] },
        },
      },
      include: {
        order: {
          include: {
            table: true,
            customer: true,
            items: {
              include: {
                product: {
                  include: {
                    translations: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return tickets.map((t) => {
      const itemsList = (t.itemsState && Array.isArray(t.itemsState))
        ? (t.itemsState as any[])
        : t.order.items.map((i) => {
            const trans = i.product.translations.find((trans) => trans.locale === 'en') || i.product.translations[0];
            return {
              productId: i.productId,
              productName: trans?.name || i.product.slug,
              quantity: i.quantity,
              notes: i.notes || '',
              modifiers: i.modifiers || [],
              isNew: false,
            };
          });

      return {
        id: t.id,
        orderId: t.orderId,
        orderNumber: t.order.code,
        orderType: t.order.type,
        tableNumber: t.order.table?.number?.toString() || null,
        customerName: t.order.customer?.name || 'Walk-in',
        notes: t.order.notes,
        createdAt: t.createdAt.toISOString(),
        status: t.status,
        priority: t.priority,
        isEdited: t.isEdited,
        items: itemsList.map((item, idx) => ({
          id: `${item.productId}-${idx}`,
          name: item.productName,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.modifiers,
          isNew: !!item.isNew,
        })),
      };
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update kitchen ticket status' })
  async updateTicket(@Param('id') id: string, @Body() body: { status: KitchenTicketStatus }) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.kitchenTicket.findUniqueOrThrow({
        where: { id },
        include: { order: true },
      });

      // Update ticket status
      const updatedTicket = await tx.kitchenTicket.update({
        where: { id },
        data: {
          status: body.status,
          startedAt: body.status === KitchenTicketStatus.IN_PROGRESS ? new Date() : undefined,
          completedAt: body.status === KitchenTicketStatus.COMPLETED ? new Date() : undefined,
        },
      });

      // Synchronize Order status
      if (body.status === KitchenTicketStatus.IN_PROGRESS) {
        await tx.order.update({
          where: { id: ticket.orderId },
          data: { status: OrderStatus.PREPARING },
        });
      } else if (body.status === KitchenTicketStatus.COMPLETED) {
        await tx.order.update({
          where: { id: ticket.orderId },
          data: { status: OrderStatus.READY },
        });
      }

      return updatedTicket;
    });
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete/Serve the kitchen order' })
  async completeOrder(@Param('id') id: string) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.kitchenTicket.findUniqueOrThrow({
        where: { id },
        include: { order: true },
      });

      // Mark ticket as completed (we'll set status to COMPLETED if not already, or keep it)
      await tx.kitchenTicket.update({
        where: { id },
        data: { status: KitchenTicketStatus.COMPLETED },
      });

      // Mark order as CLEAR
      const order = await tx.order.update({
        where: { id: ticket.orderId },
        data: { status: OrderStatus.CLEAR },
      });

      // If Dine-in and already paid, release table to CLEANING
      const isPaid = (await tx.payment.count({ where: { orderId: order.id } })) > 0;
      if (isPaid && order.type === 'DINE_IN' && order.tableId) {
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

      return { success: true };
    });
  }
}
