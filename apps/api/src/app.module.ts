import { Request, Response } from 'express';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

// Filters
import { AllExceptionsFilter } from './core/exceptions/all-exceptions.filter';

// App controller
import { AppController } from './app.controller';

// Dev controller (not available in production)
import { DevController } from './dev.controller';

// Global modules
import { DatabaseModule } from './modules/global/database/database.module';

// App modules
import { AuthModule } from 'src/modules/auth/auth.module';
import { SessionModule } from 'src/modules/session/session.module';
import { UserModule } from 'src/modules/user/user.module';
import { JwtAuthGuard } from 'src/modules/auth/infra/guard/jwt-auth.guard';

const controllers: any[] = [AppController];

if (process.env.NODE_ENV !== 'production') {
  controllers.push(DevController);
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: 60000,
            limit: 100,
          },
        ],
        skipIf: () => configService.getOrThrow('NODE_ENV') !== 'production',
      }),
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
          level:
            configService.get<string>('SILENT_LOGS') === 'true' ||
            configService.getOrThrow<string>('NODE_ENV') === 'test'
              ? 'silent'
              : configService.getOrThrow<string>('NODE_ENV') === 'production'
                ? 'info'
                : 'debug',
          redact: {
            censor: '***',
            paths: [],
          },
          serializers: {
            req: (req: Request) => ({
              id: req.id,
              method: req.method,
              url: req.url,
              headers:
                configService.getOrThrow('NODE_ENV') !== 'production'
                  ? req.headers
                  : undefined,
            }),
            res: (res: Response) => ({
              statusCode: res.statusCode,
            }),
          },
          transport:
            configService.getOrThrow('NODE_ENV') !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: false,
                    levelFirst: true,
                    translateTime: 'SYS:standard',
                  },
                }
              : undefined,
        },
      }),
    }),
    // Global
    DatabaseModule,

    // App
    AuthModule,
    SessionModule,
    UserModule,
  ],
  controllers: controllers,
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
