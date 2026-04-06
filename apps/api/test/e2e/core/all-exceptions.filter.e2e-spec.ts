import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from 'src/app.module';

import { configureApp } from 'src/configure-app';
import { ExceptionResponse } from 'src/core/exceptions/all-exceptions.filter';
import { ErrorCodes } from 'src/core/exceptions/business.exceptions';

describe('AllExceptionsFilter e2e', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    configureApp(app);

    await app.init();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Global Exception Filter', () => {
    it('should reuse the X-Request-Id provided by the client in the error response', async () => {
      const customId = 'my-custom-tracing-id-123';

      const response = await request(app.getHttpServer())
        .get('/api/v1/non-existent-route')
        .set('x-request-id', customId)
        .expect(HttpStatus.NOT_FOUND);

      const body = response.body as ExceptionResponse;

      expect(body.requestId).toBe(customId);
    });

    it('should include a requestId in the error response body for tracking', async () => {
      const errorResponse = await request(app.getHttpServer())
        .get('/api/v1/unknown-path')
        .expect(HttpStatus.NOT_FOUND);

      const body = errorResponse.body as ExceptionResponse;

      expect(body.requestId).toBeDefined();
      expect(typeof body.requestId).toBe('string');
      expect(body.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('Should handle business errors and format response correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dev/trigger-business-error')
        .expect(HttpStatus.CONFLICT);

      const body = response.body as ExceptionResponse;

      expect(body).toEqual({
        requestId: expect.any(String) as string,
        method: 'GET',
        url: '/api/v1/dev/trigger-business-error',
        timestamp: expect.any(String) as string,
        statusCode: HttpStatus.CONFLICT,
        errorCode: ErrorCodes.USER_EMAIL_ALREADY_EXISTS,
        messages: ['Email already used'],
      });
    });

    it('Should handle NestJS 413 Payload Too Large error when body is too big and format response correctly', async () => {
      const largeData = 'a'.repeat(150 * 1024);

      const response = await request(app.getHttpServer())
        .post('/api/v1/dev/test-body-validation')
        .send({ name: largeData })
        .expect(HttpStatus.PAYLOAD_TOO_LARGE);

      const body = response.body as ExceptionResponse;

      expect(body).toEqual({
        requestId: expect.any(String) as string,
        method: 'POST',
        url: '/api/v1/dev/test-body-validation',
        timestamp: expect.any(String) as string,
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        errorCode: ErrorCodes.PAYLOAD_TOO_LARGE,
        messages: ['request entity too large'],
      });
    });

    it('Should handle NestJS 404 error and format response correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dev/non-existent-route')
        .expect(HttpStatus.NOT_FOUND);

      const body = response.body as ExceptionResponse;

      expect(body).toEqual({
        requestId: expect.any(String) as string,
        method: 'GET',
        url: '/api/v1/dev/non-existent-route',
        timestamp: expect.any(String) as string,
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: ErrorCodes.NOT_FOUND,
        messages: ['Cannot GET /api/v1/dev/non-existent-route'],
      });
    });

    it('Should handle NestJS 400 error and format response correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dev/trigger-nest-error-400')
        .expect(HttpStatus.BAD_REQUEST);

      const body = response.body as ExceptionResponse;

      expect(body).toEqual({
        requestId: expect.any(String) as string,
        method: 'GET',
        url: '/api/v1/dev/trigger-nest-error-400',
        timestamp: expect.any(String) as string,
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: ErrorCodes.BAD_REQUEST,
        messages: ['Validation failed'],
      });
    });

    it('Should handle malformed JSON (Bad Request) from Express parsing', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/dev/test-body-validation')
        .set('Content-Type', 'application/json')
        .send('{"name": "broken-json", }')
        .expect(HttpStatus.BAD_REQUEST);

      const body = response.body as ExceptionResponse;

      expect(body).toEqual({
        requestId: expect.any(String) as string,
        method: 'POST',
        url: '/api/v1/dev/test-body-validation',
        timestamp: expect.any(String) as string,
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: ErrorCodes.BAD_REQUEST,
        messages: expect.any(Array) as string[],
      });
    });

    it('Should handle raw Express errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dev/trigger-express-error')
        .expect(HttpStatus.BAD_REQUEST);

      const body = response.body as ExceptionResponse;

      expect(body).toEqual({
        requestId: expect.any(String) as string,
        method: 'GET',
        url: '/api/v1/dev/trigger-express-error',
        timestamp: expect.any(String) as string,
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: ErrorCodes.EXPRESS_ERROR,
        messages: ['Technical error'],
      });
    });

    it('Should handle raw Express errors without message', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dev/trigger-express-error-no-message')
        .expect(HttpStatus.BAD_REQUEST);

      const body = response.body as ExceptionResponse;

      expect(body).toEqual({
        requestId: expect.any(String) as string,
        method: 'GET',
        url: '/api/v1/dev/trigger-express-error-no-message',
        timestamp: expect.any(String) as string,
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: ErrorCodes.EXPRESS_ERROR,
        messages: [
          'An error occured at the technical level. Please contact support with the requestId.',
        ],
      });
    });

    it('Should handle unknown crashes and mask technical details', async () => {
      const loggerSpy = jest.spyOn(app.get(Logger), 'error');

      const response = await request(app.getHttpServer())
        .get('/api/v1/dev/trigger-error-500')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR);

      const body = response.body as ExceptionResponse;

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          errorCode: ErrorCodes.INTERNAL_SERVER_ERROR,
          error: 'Database connection failed - secret credentials leaked !',
          stack: expect.any(String) as string,
        }),
      );

      expect(body).toEqual({
        requestId: expect.any(String) as string,
        method: 'GET',
        url: '/api/v1/dev/trigger-error-500',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: ErrorCodes.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String) as string,
        messages: [
          'An unexpected error occurred. Please contact support with the requestId.',
        ],
      });
    });
  });
});
