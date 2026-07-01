import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextStore {
  requestId: string;
  correlationId: string;
  traceId: string;
  userId?: string;
  tenantId?: string;
  outletId?: string;
  shiftId?: string;
  locale?: string;
  timezone?: string;
  businessDate?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class RequestContextService {
  private static readonly asyncLocalStorage = new AsyncLocalStorage<RequestContextStore>();

  static getStore(): RequestContextStore | undefined {
    return this.asyncLocalStorage.getStore();
  }

  static run(store: RequestContextStore, callback: () => any) {
    return this.asyncLocalStorage.run(store, callback);
  }

  get current(): RequestContextStore | undefined {
    return RequestContextService.getStore();
  }

  get requestId(): string | undefined {
    return this.current?.requestId;
  }

  get correlationId(): string | undefined {
    return this.current?.correlationId;
  }

  get traceId(): string | undefined {
    return this.current?.traceId;
  }

  get userId(): string | undefined {
    return this.current?.userId;
  }

  get tenantId(): string | undefined {
    return this.current?.tenantId;
  }

  get outletId(): string | undefined {
    return this.current?.outletId;
  }

  get shiftId(): string | undefined {
    return this.current?.shiftId;
  }

  get locale(): string | undefined {
    return this.current?.locale;
  }

  get timezone(): string | undefined {
    return this.current?.timezone;
  }

  get businessDate(): string | undefined {
    return this.current?.businessDate;
  }

  get deviceType(): string | undefined {
    return this.current?.deviceType;
  }

  get ipAddress(): string | undefined {
    return this.current?.ipAddress;
  }

  get userAgent(): string | undefined {
    return this.current?.userAgent;
  }
}
