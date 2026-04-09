// business.exceptions.spec.ts
import {
  ErrorCodes,
  BusinessError,
  isBusinessError,
} from './business.exceptions';

describe('TypeGuards', () => {
  describe('isBusinessError', () => {
    it('should return true for a valid business error', () => {
      const valid: BusinessError = {
        errorCode: ErrorCodes.PAYLOAD_TOO_LARGE,
        messages: ['test'],
      };
      expect(isBusinessError(valid)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isBusinessError(null)).toBe(false);
      expect(isBusinessError({ message: 'only one' })).toBe(false);
      expect(isBusinessError({ errorCode: 123, messages: [] })).toBe(false);
    });
  });
});
