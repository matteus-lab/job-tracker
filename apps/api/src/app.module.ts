import { Request, Response } from 'express';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';

// Filters
import { AllExceptionsFilter } from './core/exceptions/all-exceptions.filter';

// Guards
import { JwtAuthGuard } from 'src/core/guards/jwt-auth/jwt-auth.guard';

// App controller
import { AppController } from './app.controller';

// Dev controller (not available in production)
import { DevController } from './dev.controller';

// App modules
import { AuthModule } from 'src/modules/auth/auth.module';
import { SessionModule } from 'src/modules/session/session.module';
import { UserModule } from 'src/modules/user/user.module';

const controllers: any[] = [AppController];

if (process.env.NODE_ENV !== 'production') {
  controllers.push(DevController);
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get(
            'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
            '15m',
          ),
        },
      }),
    }),
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
    // App
    AuthModule,
    SessionModule,
    UserModule,
  ],
  controllers: controllers,
  providers: [
    JwtModule,
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
