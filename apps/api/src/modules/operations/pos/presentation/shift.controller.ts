import { Controller, Get, Post, Body, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@/prisma/prisma.service';
import { Decimal } from '@/generated/client/runtime/library';

@ApiTags('Shifts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pos/shifts')
export class ShiftController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get current active open shift' })
  async getActive(@CurrentUser() user: any) {
    const outletId = user.outletId || 'default-outlet';
    const activeShift = await this.prisma.shift.findFirst({
      where: {
        outletId,
        status: 'OPEN',
      },
      include: {
        openedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!activeShift) return null;

    const cashPayments = await this.prisma.payment.aggregate({
      where: {
        order: {
          shiftId: activeShift.id,
        },
        method: {
          type: 'CASH',
        },
      },
      _sum: {
        amount: true,
      },
    });

    const cashSales = cashPayments._sum.amount?.toNumber() || 0;

    return {
      ...activeShift,
      cashSales,
    };
  }

  @Post('open')
  @ApiOperation({ summary: 'Open a new shift' })
  async open(@Body() body: { openingCash: number }, @CurrentUser() user: any) {
    const outletId = user.outletId || 'default-outlet';
    const activeShift = await this.prisma.shift.findFirst({
      where: {
        outletId,
        status: 'OPEN',
      },
    });

    if (activeShift) {
      throw new BadRequestException('A shift is already active for this outlet');
    }

    return this.prisma.shift.create({
      data: {
        outletId,
        openedById: user.id,
        openingCash: new Decimal(body.openingCash || 0),
        status: 'OPEN',
      },
    });
  }

  @Post('close')
  @ApiOperation({ summary: 'Close the current active shift' })
  async close(@Body() body: { closingCash: number; notes?: string }, @CurrentUser() user: any) {
    const outletId = user.outletId || 'default-outlet';
    const activeShift = await this.prisma.shift.findFirst({
      where: {
        outletId,
        status: 'OPEN',
      },
    });

    if (!activeShift) {
      throw new NotFoundException('No active shift found to close');
    }

    // Sum cash payments of orders completed during this shift
    const cashPayments = await this.prisma.payment.aggregate({
      where: {
        order: {
          shiftId: activeShift.id,
        },
        method: {
          type: 'CASH',
        },
      },
      _sum: {
        amount: true,
      },
    });

    const totalCashSales = cashPayments._sum.amount || new Decimal(0);
    const expectedCash = new Decimal(activeShift.openingCash).add(totalCashSales);
    const closingCash = new Decimal(body.closingCash || 0);
    const difference = closingCash.sub(expectedCash);

    return this.prisma.shift.update({
      where: { id: activeShift.id },
      data: {
        closedById: user.id,
        closingCash,
        expectedCash,
        difference,
        closedAt: new Date(),
        status: 'CLOSED',
        cashClosings: {
          create: {
            openingBalance: activeShift.openingCash,
            totalSales: totalCashSales,
            totalExpenses: new Decimal(0),
            closingBalance: closingCash,
            difference,
            notes: body.notes || null,
          },
        },
      },
    });
  }
}
