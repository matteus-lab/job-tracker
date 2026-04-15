import { Request } from 'express';
import { HttpAdapterHost } from '@nestjs/core';
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';

import {
  BusinessError,
  ErrorCode,
  ErrorCodes,
  isBusinessError,
} from 'src/core/domain/errors/business.error';
import {
  isExpressError,
  isNestError,
  ErrorResponse,
} from './all-exceptions.types';

function mapHttpStatusToErrorCode(httpStatus: HttpStatus): ErrorCode {
  const map: Partial<Record<HttpStatus, ErrorCode>> = {
    [HttpStatus.BAD_REQUEST]: ErrorCodes.BAD_REQUEST,
    [HttpStatus.NOT_FOUND]: ErrorCodes.NOT_FOUND,
    [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCodes.PAYLOAD_TOO_LARGE,
    [HttpStatus.TOO_MANY_REQUESTS]: ErrorCodes.TOO_MANY_REQUESTS,
  };

  return map[httpStatus] ?? ErrorCodes.INTERNAL_SERVER_ERROR;
}

function mapErrorCodeToHttpStatus(errorCode: ErrorCode): HttpStatus {
  const map: Partial<Record<ErrorCode, HttpStatus>> = {
    BAD_REQUEST: HttpStatus.BAD_REQUEST,
    INTERNAL_SERVER_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
    NOT_FOUND: HttpStatus.NOT_FOUND,
    PAYLOAD_TOO_LARGE: HttpStatus.PAYLOAD_TOO_LARGE,
    TOO_MANY_REQUESTS: HttpStatus.TOO_MANY_REQUESTS,
    UNAUTHORIZED: HttpStatus.UNAUTHORIZED,

    // AUTH
    AUTH_INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
    AUTH_TOKEN_EXPIRED: HttpStatus.UNAUTHORIZED,
    AUTH_TOKEN_INVALID: HttpStatus.UNAUTHORIZED,
    AUTH_TOKEN_MISSING: HttpStatus.UNAUTHORIZED,

    // USER
    USER_EMAIL_ALREADY_EXISTS: HttpStatus.CONFLICT,
  };

  return map[errorCode] ?? HttpStatus.INTERNAL_SERVER_ERROR;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: Logger,
  ) {}

  catch(error: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const requestId = request.id || 'no-id';
    const method = request.method;
    const url = httpAdapter.getRequestUrl(request) as string;

    let errorCode: ErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
    let messages: string[] = [
      'An unexpected error occurred. Please contact support with the requestId.',
    ];
    let targetFields: string[] | undefined;
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    if (error instanceof BusinessError || isBusinessError(error)) {
      errorCode = error.errorCode;
      messages = error.messages;
      targetFields = error.targetFields;
      statusCode = mapErrorCodeToHttpStatus(error.errorCode);
    } else if (isNestError(error)) {
      errorCode = mapHttpStatusToErrorCode(error.statusCode);
      messages = Array.isArray(error.message)
        ? error.message.map(String)
        : [error.message];
      statusCode = error.statusCode;
    } else if (isExpressError(error)) {
      errorCode = mapHttpStatusToErrorCode(error.statusCode);
      messages = [
        error.message ||
          'Infrastructure error occurred. Please contact support with the requestID.',
      ];
      statusCode = error.statusCode;
    } else if (typeof error === 'string') {
      messages = [error];
    } else if (error instanceof HttpException) {
      statusCode = error.getStatus();
      errorCode = mapHttpStatusToErrorCode(statusCode);

      const response = error.getResponse();

      if (typeof response === 'object' && response !== null) {
        const nestResponse = response as Record<string, any>;
        if (Array.isArray(nestResponse.message)) {
          messages = nestResponse.message.map(String);
        } else if (typeof nestResponse.message === 'string') {
          messages = [nestResponse.message];
        } else {
          messages = [error.message];
        }
      } else {
        messages = [String(response)];
      }
    }

    // LOG
    this.logger.error({
      statusCode,
      errorCode,
      targetFields,
      error: error instanceof Error ? error.message : String(error),
      stack:
        statusCode.valueOf() >= 500 && error instanceof Error
          ? error.stack
          : undefined,
    });

    // CLIENT RESPONSE
    const errorResponse: ErrorResponse = {
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

    httpAdapter.reply(ctx.getResponse(), errorResponse, statusCode);
  }
}
