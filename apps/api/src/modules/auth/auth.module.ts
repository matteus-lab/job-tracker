import { Module } from '@nestjs/common';
import { AuthController } from './infra/auth.controller';
import { AuthService } from './engine/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from 'src/modules/user/user.module';
import { SessionModule } from 'src/modules/session/session.module';
import { JwtAuthGuard } from 'src/modules/auth/infra/guard/jwt-auth.guard';
import { HashingModule } from '../hashing/hashing.module';

@Module({
  imports: [
    HashingModule,
    UserModule,
    SessionModule,
    JwtModule.registerAsync({
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
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
