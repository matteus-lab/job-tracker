process.env.NODE_ENV = 'production';
process.env.SILENT_LOGS = 'true';

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from 'src/app.module';
import { configureApp } from 'src/configure-app';

import { ErrorCodes } from 'src/core/exceptions/business.exceptions';
import { ExceptionResponse } from 'src/core/exceptions/all-exceptions.filter';
import { PrismaService } from 'src/core/database/prisma/prisma.service';
import { getStorageToken, ThrottlerStorageService } from '@nestjs/throttler';

describe('Production e2e', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    configureApp(app);

    await app.init();

    prismaService = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prismaService.client.session.deleteMany();
    await prismaService.client.user.deleteMany();

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
    await prismaService.onModuleDestroy();

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

      const body = response.body as ExceptionResponse;

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

      const body = response.body as ExceptionResponse;

      expect(body.messages).toContain(
        'Cannot GET /api/v1/dev/test-serialization',
      );
    });
  });
});
