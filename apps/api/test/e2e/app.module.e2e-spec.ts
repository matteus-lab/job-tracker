import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from 'src/app.module';
import { configureApp } from 'src/configure-app';

import { ErrorCodes } from 'src/core/exceptions/business.exceptions';
import { ExceptionResponse } from 'src/core/exceptions/all-exceptions.filter';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/modules/auth/jwt/jwt-payload.interface';

describe('App module e2e', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    configureApp(app);

    await app.init();

    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Global Security', () => {
    it('should allow access to a @Public() route without token (200)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(HttpStatus.OK);
    });

    it('should deny access to a protected route without token (401)', async () => {
      const url = '/api/v1/dev/test-non-public-route';

      const response = await request(app.getHttpServer())
        .get(url)
        .expect(HttpStatus.UNAUTHORIZED);

      const body = response.body as ExceptionResponse;

      expect(body).toMatchObject({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: ErrorCodes.AUTH_TOKEN_MISSING,
        messages: ['Token missing'],
      });
    });

    it('should deny access with an invalid token (401)', async () => {
      const url = '/api/v1/dev/test-non-public-route';

      const response = await request(app.getHttpServer())
        .get(url)
        .set('Authorization', 'Bearer invalid-token-123')
        .expect(HttpStatus.UNAUTHORIZED);

      const body = response.body as ExceptionResponse;

      expect(body).toMatchObject({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: ErrorCodes.AUTH_TOKEN_INVALID,
        messages: ['Invalid token'],
      });
    });

    it('should deny access with an expired token (401)', async () => {
      const url = '/api/v1/dev/test-non-public-route';

      const expiredToken = jwtService.sign<JwtPayload>(
        { sub: 'user-uuid' },
        { expiresIn: '-10s' },
      );

      const response = await request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(HttpStatus.UNAUTHORIZED);

      const body = response.body as ExceptionResponse;

      expect(body).toMatchObject({
        statusCode: HttpStatus.UNAUTHORIZED,
        errorCode: ErrorCodes.AUTH_TOKEN_EXPIRED,
        messages: ['Token has expired'],
      });
    });

    it('should allow access to a non @Public() route with valid token (200)', async () => {
      const url = '/api/v1/dev/test-non-public-route';

      const validToken = jwtService.sign<JwtPayload>(
        { sub: 'user-uuid' },
        { expiresIn: '7w' },
      );

      await request(app.getHttpServer())
        .get(url)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(HttpStatus.OK);
    });
  });
});
