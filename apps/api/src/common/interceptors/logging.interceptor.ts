import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP_ACCESS');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const startTime = performance.now();
    const startCpu = process.cpuUsage();

    return next.handle().pipe(
      tap(() => {
        const duration = performance.now() - startTime;
        const cpuUsed = process.cpuUsage(startCpu);
        const heapUsed = process.memoryUsage().heapUsed;

        // Convert CPU microseconds to ms, memory bytes to MB
        const cpuTimeMs = ((cpuUsed.user + cpuUsed.system) / 1000).toFixed(2);
        const memoryMb = (heapUsed / 1024 / 1024).toFixed(2);

        this.logger.log(
          `[${req.method}] ${req.url} - Status: ${res.statusCode} - Duration: ${duration.toFixed(2)}ms - CPU Used: ${cpuTimeMs}ms - Heap: ${memoryMb}MB`,
        );
      }),
    );
  }
}
