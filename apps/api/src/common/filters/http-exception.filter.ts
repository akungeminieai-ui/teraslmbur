import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import type { ApiError } from '@teras-lmbur/types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const exceptionResponse: any =
      exception instanceof HttpException ? exception.getResponse() : null;

    const errors =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? exceptionResponse.errors || exceptionResponse.message
        : undefined;

    const errorResponse: ApiError = {
      success: false,
      message,
      statusCode: status,
      errors: typeof errors === 'string' ? { message: [errors] } : errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}
