import { ReqId } from 'pino-http';
import { BusinessErrorJson } from 'src/core/domain/errors/business.error';

export interface NestError {
  statusCode: number;
  message: string | string[];
  error: string;
}

export function isNestError(err: unknown): err is NestError {
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

export interface ExpressError {
  statusCode: number;
  name?: string;
  message?: string;
}

export function isExpressError(err: unknown): err is ExpressError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as Record<string, unknown>).statusCode === 'number'
  );
}

export interface ErrorResponse extends BusinessErrorJson {
  requestId: ReqId;
  method: string;
  url: string;
  timestamp: string;
  statusCode: number;
}
