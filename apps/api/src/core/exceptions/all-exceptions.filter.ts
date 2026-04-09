// src/common/filters/all-exceptions.filter.ts
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { Request } from 'express';

// Injected dependencies
import { HttpAdapterHost } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import {
  BusinessError,
  type ErrorCode,
  ErrorCodes,
  isBusinessError,
} from './business.exceptions';
import { ReqId } from 'pino-http';

interface NestError {
  statusCode: number;
  message: string | string[];
  error: string;
}

interface ExpressError {
  statusCode: number;
  name?: string;
  message?: string;
}

export interface ExceptionResponse extends BusinessError {
  requestId: ReqId;
  method: string;
  url: string;
  timestamp: string;
  statusCode: number;
}

function isNestError(err: unknown): err is NestError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as Record<string, unknown>).statusCode === 'number' &&
    'error' in err &&
    typeof err.error === 'string' &&
    'message' in err &&
    (typeof err.message === 'string' || Array.isArray(err.message))
  );
}

function isExpressError(err: unknown): err is ExpressError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as Record<string, unknown>).statusCode === 'number'
  );
}

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
