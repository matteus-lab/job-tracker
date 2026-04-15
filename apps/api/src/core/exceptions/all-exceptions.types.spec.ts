import { HttpStatus } from '@nestjs/common';
import {
  NestError,
  isNestError,
  ExpressError,
  isExpressError,
} from './all-exceptions.types';

describe('TypeGuards', () => {
  describe('isNestError', () => {
    it('should return true for a valid nest error', () => {
      const valids: NestError[] = [
        {
          statusCode: HttpStatus.METHOD_NOT_ALLOWED,
          message: 'single string',
          error: 'Method Not Allowed',
        },
        {
          statusCode: 400,
          message: ['error 1', 'error 2'],
          error: 'Bad Request',
        },
      ];

      valids.forEach((v) => {
        expect(isNestError(v)).toBeTruthy();
      });
    });

    it('should return false for invalid objects', () => {
      const invalids = [
        null,
        undefined,
        {},
        { message: 'statusCode missing', error: 'statusCode missing' },
        { statusCode: 400 },
        { statusCode: 400, message: 'Missing error' },
        { statusCode: 400, error: 'Missing message' },
        {
          statusCode: '400',
          message: 'Wrong statusCode type',
          error: 'Wrong Type',
        },
        {
          statusCode: '400',
          message: 123,
          error: 'Wrong Type',
        },
        {
          statusCode: '400',
          message: 'Wrong error type',
          error: 123,
        },
      ];

      invalids.forEach((iv) => {
        expect(isNestError(iv)).toBeFalsy();
      });
    });
  });

  describe('isExpressError', () => {
    it('should return true for a valid express error', () => {
      const valids: ExpressError[] = [
        {
          statusCode: HttpStatus.METHOD_NOT_ALLOWED,
          message: 'single string',
          name: 'single string',
        },
        {
          statusCode: HttpStatus.METHOD_NOT_ALLOWED,
        },
      ];

      valids.forEach((v) => {
        expect(isExpressError(v)).toBeTruthy();
      });
    });

    it('should return false for invalid objects', () => {
      const invalids = [
        null,
        undefined,
        {},
        { message: 'statusCode missing' },
        { name: 'statusCode missing' },
        { message: 'statusCode missing', name: 'statusCode missing' },
        { statusCode: '400' },
      ];

      invalids.forEach((iv) => {
        expect(isExpressError(iv)).toBeFalsy();
      });
    });
  });
});
