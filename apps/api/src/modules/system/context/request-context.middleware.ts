import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService, RequestContextStore } from './request-context.service';
import * as crypto from 'crypto';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
    const traceId = (req.headers['x-trace-id'] as string) || crypto.randomUUID();

    // Set trace headers on response
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-trace-id', traceId);

    // Extract device/client details
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const locale = (req.headers['accept-language'] as string) || 'en';
    const timezone = (req.headers['x-timezone'] as string) || 'Africa/Cairo';

    // Simple device detection
    let deviceType = 'desktop';
    if (/mobile/i.test(userAgent)) deviceType = 'mobile';
    else if (/tablet/i.test(userAgent)) deviceType = 'tablet';

    // Extract authorization details from JWT if available
    let userId: string | undefined;
    let outletId: string | undefined;
    let tenantId: string | undefined;
    let shiftId: string | undefined;

    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
          userId = payload.sub || payload.id;
          outletId = payload.outletId;
          tenantId = payload.tenantId || payload.outletId;
          shiftId = payload.shiftId;
        }
      }
    } catch (e) {
      // Allow authorization guards to throw formal exceptions later
    }

    // Determine operational business date (based on default 6 AM offset)
    const today = new Date();
    const startHour = 6;
    const checkHour = today.getHours();
    const checkMinute = today.getMinutes();
    if (checkHour < startHour || (checkHour === startHour && checkMinute < 0)) {
      today.setDate(today.getDate() - 1);
    }
    const yyyy = today.getFullYear();
    const mm = (today.getMonth() + 1).toString().padStart(2, '0');
    const dd = today.getDate().toString().padStart(2, '0');
    const businessDate = `${yyyy}-${mm}-${dd}`;

    const store: RequestContextStore = {
      requestId,
      correlationId,
      traceId,
      userId,
      outletId,
      tenantId,
      shiftId,
      locale,
      timezone,
      businessDate,
      deviceType,
      ipAddress,
      userAgent,
    };

    // Run express request chain inside the async local storage zone
    RequestContextService.run(store, () => next());
  }
}
