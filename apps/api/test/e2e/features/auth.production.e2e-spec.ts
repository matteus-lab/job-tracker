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

  afterAll(async () => {
    await prismaService.onModuleDestroy();

    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    const route = '/api/v1/auth/register';

    const payload = {
      email: 'throttler@test.com',
      password: 'Password123!',
    };

    it('should return a refresh cookie with Secure', async () => {
      const response = await request(app.getHttpServer())
        .post(route)
        .send(payload)
        .expect(HttpStatus.CREATED);

      const cookies = response.get('Set-Cookie');

      expect(cookies).toBeDefined();

      const refreshCookie = cookies?.find((c) => c.startsWith('refreshToken='));

      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('Secure');
    });

    it('should return 429 Too Many Requests after 3 registration attempts in production', async () => {
      // 1st attempt : 201 Created or 409 if already exists
      await request(app.getHttpServer())
        .post(route)
        .send(payload)
        .expect((res) => {
          expect([HttpStatus.CREATED, HttpStatus.CONFLICT]).toContain(
            res.status,
          );
        });

      // 2nd attempt
      await request(app.getHttpServer())
        .post(route)
        .send(payload)
        .expect((res) => {
          expect([HttpStatus.CREATED, HttpStatus.CONFLICT]).toContain(
            res.status,
          );
        });

      // 3rd attempt
      await request(app.getHttpServer())
        .post(route)
        .send(payload)
        .expect((res) => {
          expect([HttpStatus.CREATED, HttpStatus.CONFLICT]).toContain(
            res.status,
          );
        });

      // 4th attempt: 429 Too Many Requests
      const response = await request(app.getHttpServer())
        .post(route)
        .send(payload)
        .expect(HttpStatus.TOO_MANY_REQUESTS);

      const body = response.body as ExceptionResponse;

      expect(body).toEqual({
        requestId: expect.any(String) as string,
        method: 'POST',
        url: route,
        timestamp: expect.any(String) as string,
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        errorCode: ErrorCodes.TOO_MANY_REQUESTS,
        messages: ['ThrottlerException: Too Many Requests'],
      });
    });
  });
});
