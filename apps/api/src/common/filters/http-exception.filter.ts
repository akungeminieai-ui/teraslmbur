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
    let errorMsg = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      if (status === HttpStatus.UNAUTHORIZED) {
        code = 'UNAUTHORIZED';
        errorMsg = 'Unauthorized';
      } else if (status === HttpStatus.FORBIDDEN) {
        code = 'INSUFFICIENT_PERMISSION';
        errorMsg = 'Insufficient permission';
      } else if (status === HttpStatus.NOT_FOUND) {
        code = 'NOT_FOUND';
        errorMsg = 'Not found';
      } else {
        const respBody: any = exception.getResponse();
        if (respBody && typeof respBody === 'object') {
          code = respBody.code || 'BAD_REQUEST';
          if (Array.isArray(respBody.message)) {
            errorMsg = respBody.message[0] || 'Validation failed';
            errorsList = respBody.message.map((msg: any) => ({
              message: msg,
            }));
          } else if (respBody.errors && Array.isArray(respBody.errors)) {
            errorsList = respBody.errors;
            errorMsg = respBody.errors[0]?.message || respBody.message || 'Validation failed';
          } else if (respBody.message) {
            errorMsg = respBody.message;
            errorsList = [{ message: respBody.message }];
          }
        } else {
          code = 'BAD_REQUEST';
          errorMsg = typeof respBody === 'string' ? respBody : 'Bad request';
        }
      }
    } else if (exception instanceof Error) {
      errorMsg = exception.message;
      errorsList = [{ message: exception.message }];
    }

    const errorResponse = {
      success: false,
      code,
      message: errorMsg,
      errors: errorsList,
    };

    response.status(status).json(errorResponse);
  }
}
