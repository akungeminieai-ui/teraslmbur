import { Module } from '@nestjs/common';
import { PosController } from './presentation/pos.controller';
import { PosService } from './application/pos.service';
import { PrismaPosRepository } from './infrastructure/prisma-pos.repository';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuditModule } from '../../system/audit/audit.module';
import { EventBusModule } from '../../system/event-bus/event-bus.module';
import { SequenceModule } from '../../system/sequence/sequence.module';

// New presentation controllers
import { CustomerController } from './presentation/customer.controller';
import { TableController } from './presentation/table.controller';
import { OrderController } from './presentation/order.controller';
import { PaymentController } from './presentation/payment.controller';
import { KitchenController } from './presentation/kitchen.controller';
import { ShiftController } from './presentation/shift.controller';
import { PublicOrderController } from './presentation/public-order.controller';

@Module({
  imports: [PrismaModule, AuditModule, EventBusModule, SequenceModule],
  controllers: [
    PosController,
    CustomerController,
    TableController,
    OrderController,
    PaymentController,
    KitchenController,
    ShiftController,
    PublicOrderController,
  ],
  providers: [PosService, PrismaPosRepository],
  exports: [PosService, PrismaPosRepository],
})
export class PosModule {}
