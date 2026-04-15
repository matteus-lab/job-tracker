process.env.NODE_ENV = 'production';
process.env.SILENT_LOGS = 'true';

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from 'src/app.module';
import { configureApp } from 'src/configure-app';

import { ErrorCodes } from 'src/core/domain/errors/business.error';
import { ErrorResponse } from 'src/core/infra/filters/exceptions/all-exceptions.types';
import { PrismaAdapter } from 'src/modules/persistence/infra/prisma.adapter';
import { getStorageToken, ThrottlerStorageService } from '@nestjs/throttler';

describe('Production e2e', () => {
  let app: INestApplication<App>;
  let prisma: PrismaAdapter;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    configureApp(app);

    await app.init();

    prisma = app.get(PrismaAdapter);
  });

  beforeEach(async () => {
    await prisma.client.session.deleteMany();
    await prisma.client.user.deleteMany();

    // Reset throttler storage to ensure test isolation
    const throttlerStorage: ThrottlerStorageService =
      app.get(getStorageToken());
    throttlerStorage.storage.clear();
    throttlerStorage.onApplicationShutdown();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();

    await app.close();
  });

  describe('Throttler', () => {
    it('should return 429 Too Many Requests after exceeding limit', async () => {
      for (let i = 0; i < 100; i++) {
        await request(app.getHttpServer()).get('/api/v1/health');
      }

      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      const body = response.body as ErrorResponse;

      expect(body).toEqual({
        requestId: expect.any(String) as string,
        method: 'GET',
        url: '/api/v1/health',
        timestamp: expect.any(String) as string,
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        errorCode: ErrorCodes.TOO_MANY_REQUESTS,
        messages: ['ThrottlerException: Too Many Requests'],
      });
    });
  });

  describe('dev.controller.ts', () => {
    it('Should NOT expose DevController routes (404)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dev/test-serialization')
        .expect(HttpStatus.NOT_FOUND);

      const body = response.body as ErrorResponse;

      expect(body.messages).toContain(
        'Cannot GET /api/v1/dev/test-serialization',
      );
    });
  });
});
