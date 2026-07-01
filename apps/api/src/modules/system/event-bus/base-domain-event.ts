import * as crypto from 'crypto';

export class BaseDomainEvent<T = any> {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly correlationId?: string;
  readonly requestId?: string;

  constructor(
    readonly eventName: string,
    readonly aggregateId: string,
    readonly aggregateType: string,
    readonly payload: T,
    readonly version = 1,
    readonly metadata: Record<string, any> = {},
    traceContext?: { correlationId?: string; requestId?: string },
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredAt = new Date();
    this.correlationId = traceContext?.correlationId;
    this.requestId = traceContext?.requestId;
  }
}
