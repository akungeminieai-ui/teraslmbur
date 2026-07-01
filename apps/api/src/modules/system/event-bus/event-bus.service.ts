import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseDomainEvent } from './base-domain-event';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly contextService: RequestContextService,
  ) {}

  /**
   * Publishes a Domain Event asynchronously across the application, auto-binding RequestContext.
   */
  publish(event: BaseDomainEvent): void {
    const store = this.contextService.current;

    // Auto-inject correlation contexts if not explicitly provided
    const correlationId = event.correlationId || store?.correlationId;
    const requestId = event.requestId || store?.requestId;

    const enrichedEvent = new BaseDomainEvent(
      event.eventName,
      event.aggregateId,
      event.aggregateType,
      event.payload,
      event.version,
      event.metadata,
      { correlationId, requestId },
    );

    this.logger.debug(
      `📢 Publishing event: ${enrichedEvent.eventName} (Aggregate: ${enrichedEvent.aggregateType}:${enrichedEvent.aggregateId})`,
    );

    // Emit event asynchronously
    this.eventEmitter.emit(enrichedEvent.eventName, enrichedEvent);
  }

  /**
   * Helper method to subscribe to events programmatically.
   */
  subscribe(eventName: string, handler: (event: any) => void): void {
    this.eventEmitter.on(eventName, handler);
  }
}
