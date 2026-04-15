export const ErrorCodes = {
  // --- SYSTEM & GENERIC ---
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // --- AUTHENTIFICATION ---
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_NOT_FOUND: 'AUTH_SESSION_NOT_FOUND',
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',

  // --- USER ---
  USER_EMAIL_ALREADY_EXISTS: 'USER_EMAIL_ALREADY_EXISTS',

  // --- DOMAIN ---
} as const;
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class BusinessError extends Error {
  public readonly errorCode: ErrorCode;
  public readonly messages: string[];
  public readonly targetFields?: string[];

  constructor(
    payload: {
      errorCode: ErrorCode;
      messages: string[];
      targetFields?: string[];
    },
    options?: ErrorOptions,
  ) {
    super(payload.messages[0] ?? 'A business error occurred', options);

    this.name = 'BusinessError';
    this.errorCode = payload.errorCode;
    this.messages = payload.messages;
    this.targetFields = payload.targetFields;

    Object.setPrototypeOf(this, BusinessError.prototype);
  }
}

export type BusinessErrorJson = Pick<
  BusinessError,
  'errorCode' | 'messages' | 'targetFields'
>;

export function isBusinessError(obj: unknown): obj is BusinessErrorJson {
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
