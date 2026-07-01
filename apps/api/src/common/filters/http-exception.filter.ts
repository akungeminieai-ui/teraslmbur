import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';


@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let code = 'INTERNAL_SERVER_ERROR';
    let errorsList: any[] = [];

    if (exception instanceof HttpException) {
      if (status === HttpStatus.UNAUTHORIZED) {
        code = 'UNAUTHORIZED';
      } else if (status === HttpStatus.FORBIDDEN) {
        code = 'INSUFFICIENT_PERMISSION';
      } else if (status === HttpStatus.NOT_FOUND) {
        code = 'NOT_FOUND';
      } else {
        const respBody: any = exception.getResponse();
        if (respBody && typeof respBody === 'object') {
          code = respBody.code || 'BAD_REQUEST';
          if (Array.isArray(respBody.message)) {
            errorsList = respBody.message.map((msg: any) => ({
              message: msg,
            }));
          } else if (respBody.errors && Array.isArray(respBody.errors)) {
            errorsList = respBody.errors;
          } else if (respBody.message) {
            errorsList = [{ message: respBody.message }];
          }
        } else {
          code = 'BAD_REQUEST';
        }
      }
    } else if (exception instanceof Error) {
      errorsList = [{ message: exception.message }];
    }

    const errorResponse = {
      success: false,
      code,
      message: null,
      errors: errorsList,
    };

    response.status(status).json(errorResponse);
  }
}
