import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from 'src/app.module';

import { configureApp } from 'src/configure-app';
import { ExceptionResponse } from 'src/core/exceptions/all-exceptions.filter';
import { ErrorCodes } from 'src/core/exceptions/business.exceptions';
import { ConfigService } from '@nestjs/config';

describe('configure-app e2e', () => {
  let app: INestApplication<App>;

  const createTestApp = async (
    configOverrides: Record<string, any> = {},
  ): Promise<INestApplication<App>> => {
    const config = {
      NODE_ENV: 'development',
      TRUST_PROXY: false,
      ALLOWED_ORIGINS: 'http://localhost:3000',
      SILENT_LOGS: 'true',
      ...configOverrides,
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        getOrThrow: jest.fn((key: string) => {
          return config[key] as string | number | boolean;
        }),
        get: jest.fn((key: string, defaultValue?: any) => {
          return (config[key] ?? defaultValue) as string | number | boolean;
        }),
      })
      .compile();

    const testApp = moduleFixture.createNestApplication();

    configureApp(testApp);

    await testApp.init();

    return testApp;
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Trust Proxy', () => {
    it('should NOT trust proxy by default', async () => {
      const proxyApp = await createTestApp({ TRUST_PROXY: false });
      const response = await request(proxyApp.getHttpServer())
        .get('/api/v1/health')
        .set('X-Forwarded-For', '1.2.3.4');

      expect(response.status).toBe(HttpStatus.OK);
      await proxyApp.close();
    });

    it('should trust proxy when enabled (string)', async () => {
      const proxyApp = await createTestApp({ TRUST_PROXY: '1.2.3.4' });
      expect(proxyApp).toBeDefined();
      await proxyApp.close();
    });

    it('should trust proxy when enabled (true)', async () => {
      const proxyApp = await createTestApp({ TRUST_PROXY: 'true' });
      expect(proxyApp).toBeDefined();
      await proxyApp.close();
    });
  });

  describe('2. Helmet', () => {
    it('Should have security headers (Helmet)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      expect(response.headers['x-dns-prefetch-control']).toBe('off');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-download-options']).toBe('noopen');
      expect(response.headers['x-xss-protection']).toBe('0');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['cross-origin-opener-policy']).toBe(
        'same-origin',
      );
      expect(response.headers['cross-origin-resource-policy']).toBe(
        'same-origin',
      );
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('3. CORS', () => {
    it('Should ALLOW requests with NO origin (e.g. server-to-server)', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/health');

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('Should handle whitelisting', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
      expect(response.headers['vary']).toContain('Origin');
    });

    it('Should REJECT non-whitelisted origins', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('Origin', 'http://malicious-site.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('Should REJECT with error message if configured', async () => {
      const corsApp = await createTestApp({
        ALLOWED_ORIGINS: 'http://allowed.com',
        NODE_ENV: 'production',
      });

      const response = await request(corsApp.getHttpServer())
        .get('/api/v1/health')
        .set('Origin', 'http://malicious-site.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();

      await corsApp.close();
    });

    it('Should handle preflight requests (OPTIONS)', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/v1/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
      expect(response.headers['access-control-allow-methods']).toContain(
        'POST',
      );
    });
  });

  describe('4. Routing (Prefix & Versioning)', () => {
    it('should NOT find route without api prefix', async () => {
      await request(app.getHttpServer())
        .get('/v1/health')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should NOT find route without version', async () => {
      await request(app.getHttpServer())
        .get('/api/health')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should find route with api/v1 prefix', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(HttpStatus.OK);
    });
  });

  describe('5. Global ValidationPipe', () => {
    it('should block requests with non-whitelisted properties in Body', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/dev/test-body-validation')
        .send({
          name: 'John Doe', // valid
          hackerField: 'target', // forbidden
        })
        .expect(HttpStatus.BAD_REQUEST);

      const body = response.body as ExceptionResponse;

      expect(body).toEqual({
        requestId: expect.any(String) as string,
        method: 'POST',
        url: '/api/v1/dev/test-body-validation',
        timestamp: expect.any(String) as string,
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: ErrorCodes.BAD_REQUEST,
        messages: ['property hackerField should not exist'],
      });
    });

    it('should block requests with invalid query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dev/test-query-validation')
        .query({ age: 'not-a-number' })
        .expect(HttpStatus.BAD_REQUEST);

      const body = response.body as ExceptionResponse;

      expect(body).toEqual({
        requestId: expect.any(String) as string,
        method: 'GET',
        url: '/api/v1/dev/test-query-validation?age=not-a-number',
        timestamp: expect.any(String) as string,
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: ErrorCodes.BAD_REQUEST,
        messages: ['age must be a number string'],
      });
    });

    it('should transform types automatically (e.g. string to number in query)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dev/test-transform')
        .query({ age: '25' })
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        type: 'number',
        value: 25,
      });
    });
  });

  describe('6. Global Serializer Serialization', () => {
    it('should transform response and include only @Expose fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dev/test-serialization')
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({
        id: 1,
        username: 'John Doe',
      });

      expect(response.body).not.toHaveProperty('internalSecret');
    });
  });
});
