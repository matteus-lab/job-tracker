import {
  BusinessErrorJson,
  ErrorCodes,
  isBusinessError,
} from './business.error';

describe('isBusinessError', () => {
  it('should return true for a valid business error', () => {
    const valids: BusinessErrorJson[] = [
      {
        errorCode: ErrorCodes.UNAUTHORIZED,
        messages: [],
      },
      {
        errorCode: ErrorCodes.UNAUTHORIZED,
        messages: ['msg 1'],
      },
      {
        errorCode: ErrorCodes.UNAUTHORIZED,
        messages: ['msg 1', 'msg 2'],
        targetFields: ['field 1', 'field 2'],
      },
    ];

    valids.forEach((v) => {
      expect(isBusinessError(v)).toBeTruthy();
    });
  });

  it('should return false for invalid objects', () => {
    const invalids = [
      null,
      undefined,
      {},
      { messages: [], targetFields: [] },
      { errorCode: ErrorCodes.BAD_REQUEST, targetFields: [] },
      { errorCode: ErrorCodes.BAD_REQUEST, messages: 'Must be an array' },
      {
        errorCode: 400,
        messages: ['ErrorCode is not ErrorCode type'],
      },
      {
        statusCode: 'Not a ErrorCode',
        messages: ['Non valid ErrorCode'],
      },
    ];

    invalids.forEach((iv) => {
      expect(isBusinessError(iv)).toBeFalsy();
    });
  });
});
