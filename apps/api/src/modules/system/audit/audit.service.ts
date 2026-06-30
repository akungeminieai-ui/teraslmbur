import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Logger } from 'nestjs-pino';

interface AuditLogOptions {
  action: string;
  resource: string;
  resourceId: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  userId: string;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger
  ) {}

  /**
   * Log a critical action to the immutable database audit ledger.
   * Also writes a structured warning/info log to Pino.
   */
  async log(options: AuditLogOptions): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: options.action,
          resource: options.resource,
          resourceId: options.resourceId,
          oldValue: options.oldValue ?? undefined,
          newValue: options.newValue ?? undefined,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
          device: options.device,
          userId: options.userId,
        },
      });

      this.logger.log(
        {
          action: options.action,
          resource: options.resource,
          resourceId: options.resourceId,
          userId: options.userId,
        },
        `Audit Log Recorded: User ${options.userId} executed ${options.action} on ${options.resource}:${options.resourceId}`
      );
    } catch (error) {
      // Degrade gracefully but log the error
      this.logger.error(
        { error, options },
        'Failed to record database audit log'
      );
    }
  }
}
