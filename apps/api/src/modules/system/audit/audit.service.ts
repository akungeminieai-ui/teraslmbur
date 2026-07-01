import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Logger } from 'nestjs-pino';
import { RequestContextService } from '../context/request-context.service';

interface AuditLogOptions {
  action: string;
  resource: string;
  resourceId: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  reason?: string;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
    private readonly contextService: RequestContextService,
  ) {}

  /**
   * Log a critical action to the immutable database audit ledger.
   * Automatically resolves trace, IP, device type, and auth context details.
   */
  async log(options: AuditLogOptions): Promise<void> {
    const store = this.contextService.current;

    const userId = store?.userId || 'SYSTEM';
    const requestId = store?.requestId;
    const correlationId = store?.correlationId;
    const ipAddress = store?.ipAddress;
    const userAgent = store?.userAgent;
    const device = store?.deviceType;

    try {
      await this.prisma.auditLog.create({
        data: {
          action: options.action,
          resource: options.resource,
          resourceId: options.resourceId,
          oldValue: options.oldValue ?? undefined,
          newValue: options.newValue ?? undefined,
          ipAddress,
          userAgent,
          device,
          userId,
        },
      });

      this.logger.log(
        {
          action: options.action,
          resource: options.resource,
          resourceId: options.resourceId,
          userId,
          requestId,
          correlationId,
          reason: options.reason,
        },
        `Audit Log: ${userId} executed '${options.action}' on ${options.resource}:${options.resourceId}`,
      );
    } catch (error) {
      // Degrade gracefully but log the error to avoid blocking transaction commits
      this.logger.error(
        { error, options },
        'Failed to write database audit log entry',
      );
    }
  }

  /**
   * Retrieves chronological audit timeline for a specific database entity/resource.
   */
  async getTimeline(resource: string, resourceId: string): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      where: {
        resource,
        resourceId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
