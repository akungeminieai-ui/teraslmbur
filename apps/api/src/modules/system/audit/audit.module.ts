import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './presentation/audit.controller';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
