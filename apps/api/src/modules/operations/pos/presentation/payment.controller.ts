import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '@/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @ApiOperation({ summary: 'Record payment for an order' })
  async create(@Body() body: { orderId: string; methodCode: 'CASH' | 'QRIS'; amount: number; reference?: string }) {
    // 1. Resolve or create payment method
    let paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { code: body.methodCode },
    });

    if (!paymentMethod) {
      paymentMethod = await this.prisma.paymentMethod.create({
        data: {
          code: body.methodCode,
          type: body.methodCode === 'CASH' ? 'CASH' : 'E_WALLET',
          isActive: true,
        },
      });
    }

    // 2. Create payment record
    return this.prisma.payment.create({
      data: {
        orderId: body.orderId,
        paymentMethodId: paymentMethod.id,
        amount: new Decimal(body.amount),
        reference: body.reference || null,
      },
    });
  }
}
