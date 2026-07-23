import { Module } from '@nestjs/common';
import { PosModule } from './pos/pos.module';

@Module({
  imports: [PosModule],
  exports: [PosModule],
})
export class OperationsModule {}
