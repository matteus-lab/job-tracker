import { HttpException, HttpStatus } from '@nestjs/common';

export const ErrorCodes = {
  // Business specific codes
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  USER_EMAIL_ALREADY_EXISTS: 'USER_EMAIL_ALREADY_EXISTS',
  UNAUTHORIZED: 'UNAUTHORIZED',

  // NEST HTTP specific cases
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',

  // EXPRESS_ERROR specific cases
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',

  // Generic codes by layer
  BUSINESS_ERROR: 'BUSINESS_ERROR',
  EXPRESS_ERROR: 'EXPRESS_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/*
 *  TYPE GUARD
 */
export interface BusinessError {
  errorCode: ErrorCode;
  messages: string[];
  targetFields?: string[];
}

export function isBusinessError(obj: unknown): obj is BusinessError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'errorCode' in obj &&
    typeof obj.errorCode === 'string' &&
    (Object.values(ErrorCodes) as string[]).includes(obj.errorCode) &&
    'messages' in obj &&
    Array.isArray(obj.messages)
  );
}

export class AppBusinessException extends HttpException {
  constructor(
    public readonly businessError: BusinessError,
    statusCode: HttpStatus,
  ) {
    super(businessError, statusCode);
  }
}
