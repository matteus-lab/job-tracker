// src/setup-app.ts
import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

import helmet from 'helmet';
import cookieParser from 'cookie-parser';

export function configureApp(app: INestApplication) {
  const configService = app.get(ConfigService);

  // 0.1 ENV variables
  const nodeEnv = configService.getOrThrow<string>('NODE_ENV');

  // 0.2 App initialisation
  const reflector = app.get(Reflector);
  const expressApp = app as NestExpressApplication;

  // 1. Trust proxy (if IP is behind Load Balancer)
  const trustProxy = configService.get<string | boolean>('TRUST_PROXY', false);
  if (trustProxy) {
    expressApp.set('trust proxy', trustProxy === 'true' ? true : trustProxy);
  }

  // 2. Security using helmet
  app.use(helmet());

  // 3. CORS
  const originsConfig = configService.get<string>('ALLOWED_ORIGINS');
  const allowedOrigins = originsConfig ? originsConfig.split(',') : [];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      if (nodeEnv === 'development' && origin.startsWith('http://localhost:')) {
        callback(null, true);
        return;
      }

      callback(
        new Error(
          `CORS Error: Origin ${origin} not allowed in ${nodeEnv} mode`,
        ),
      );
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  } as CorsOptions);

  // 4.1 Cookies (before routes to populate req.cookies)
  app.use(cookieParser());

  // 4.2 API route prefix
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 5. Validation & Transformation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 6. Serialization (exclude all field but not @Expose)
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector, {
      strategy: 'excludeAll',
    }),
  );

  return app;
}
