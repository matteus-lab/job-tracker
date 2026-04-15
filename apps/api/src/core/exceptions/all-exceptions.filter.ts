import { Request } from 'express';
import { HttpAdapterHost } from '@nestjs/core';
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';

import {
  type ErrorCode,
  ErrorCodes,
  isBusinessError,
} from './business.exceptions';
import {
  ExceptionResponse,
  isExpressError,
  isNestError,
} from './all-exceptions.types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const requestId = request.id || 'no-id';
    const method = request.method;
    const url = httpAdapter.getRequestUrl(request) as string;

    let statusCode: HttpStatus;
    let errorCode: ErrorCode;
    let targetFields: string[] | undefined;
    let messages: string[];

    // Case 0 : Interval server error with default response
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    errorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
    messages = [
      'An unexpected error occurred. Please contact support with the requestId.',
    ];

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      // Case 1.0 : Business error with default response
      statusCode = exception.getStatus();
      errorCode = ErrorCodes.BUSINESS_ERROR;
      messages = [
        'An error occured at the framework level. Please contact support with the requestId.',
      ];

      if (isBusinessError(response)) {
        // CASE 1.1 : Business error
        errorCode = response.errorCode;
        messages = response.messages;
        targetFields = response.targetFields;
      } else if (isNestError(response)) {
        // CASE 1.2 : Standard Nest error (validation, etc.)
        errorCode = response.error
          .toUpperCase()
          .replace(/\s+/g, '_') as ErrorCode;

        messages = Array.isArray(response.message)
          ? response.message.map(String)
          : [response.message];
      } else if (typeof response === 'string') {
        // CASE 1.3 : Raw message
        messages = [response];

        if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
          errorCode = ErrorCodes.TOO_MANY_REQUESTS;
        }
      }
    } else if (isExpressError(exception)) {
      // CASE 2 : Express error
      statusCode = exception.statusCode;
      errorCode = ErrorCodes.EXPRESS_ERROR;
      messages = [
        exception.message ||
          'An error occured at the technical level. Please contact support with the requestId.',
      ];

      if (statusCode === HttpStatus.PAYLOAD_TOO_LARGE) {
        errorCode = ErrorCodes.PAYLOAD_TOO_LARGE;
      }
    }

    // LOG
    this.logger.error({
      statusCode,
      errorCode,
      targetFields,
      error: exception instanceof Error ? exception.message : String(exception),
      stack:
        statusCode.valueOf() >= 500 && exception instanceof Error
          ? exception.stack
          : undefined,
    });

    // CLIENT RESPONSE
    const exceptionResponse: ExceptionResponse = {
      requestId,
      method,
      url,
      statusCode,
      errorCode,
      targetFields,
      // Specific to user
      timestamp: new Date().toISOString(),
      messages,
    };

    httpAdapter.reply(ctx.getResponse(), exceptionResponse, statusCode);
  }
}
