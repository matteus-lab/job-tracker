import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as packageJson from '../package.json';

import { configureApp } from './configure-app';

// App module
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);

  // 1. Specific to runtime
  app.useLogger(app.get(Logger)); // logger pino before everything
  app.enableShutdownHooks(); // close db on crash or shutdown

  // 2. Config API
  configureApp(app);

  // 3. SWAGGER : specific to dev environment
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Job Tracker API')
      .setVersion(packageJson.version)
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, documentFactory);
  }

  // 9. LAUNCH
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
