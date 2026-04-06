import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import {
  AppBusinessException,
  ErrorCodes,
} from 'src/core/exceptions/business.exceptions';

import {
  ITRANSACTION_MANAGER_TOKEN,
  type ITransactionManager,
} from 'src/core/database/transaction-manager.interface';

import {
  IHASHING_SERVICE_TOKEN,
  type IHashingService,
} from 'src/core/hashing/hashing.service.interface';

// Services
import { UserService } from 'src/modules/user/user.service';
import { SessionService } from 'src/modules/session/session.service';

// Auth module
import { RegisterRequestDto } from './schemas/dto/request/register.request.dto';
import { LoginRequestDto } from './schemas/dto/request/login.request.dto';
import { AuthEntity } from './schemas/entities/auth.entity';
import { AuthMapper } from './auth.mapper';

// Other
import { UserWithPasswordEntity } from '../user/schemas/entities/userWithPassword.entity';
import { JwtPayload } from 'src/modules/auth/jwt/jwt-payload.interface';

@Injectable()
export class AuthService {
  /* v8 ignore start */
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,

    @Inject(ITRANSACTION_MANAGER_TOKEN)
    private readonly txManager: ITransactionManager,

    @Inject(IHASHING_SERVICE_TOKEN)
    private readonly hashingService: IHashingService,
  ) {}
  /* v8 ignore stop */

  private generateAccessToken(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  async register(
    dto: RegisterRequestDto,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthEntity> {
    return await this.txManager.runInTransaction(async () => {
      const user = await this.userService.create(dto);

      const accessToken = this.generateAccessToken({
        sub: user.id,
      });

      const { sessionEntity, rawRefreshToken } =
        await this.sessionService.create({
          userId: user.id,
          userAgent: metadata?.userAgent,
          ipAddress: metadata?.ipAddress,
        });

      return AuthMapper.toEntity({
        user,
        accessToken,
        rawRefreshToken,
        expiresAt: sessionEntity.expiresAt,
      });
    });
  }

  async login(
    dto: LoginRequestDto,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<AuthEntity> {
    const invalidCredentialError = new AppBusinessException(
      {
        errorCode: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        messages: ['Invalid credentials'],
        targetFields: ['email', 'password'],
      },
      HttpStatus.UNAUTHORIZED,
    );

    const user: UserWithPasswordEntity | null =
      await this.userService.getByEmailWithPassword(dto.email);

    if (!user) throw invalidCredentialError;

    const isPasswordValid = await this.hashingService.verify(
      dto.password,
      user.password,
    );

    if (!isPasswordValid) throw invalidCredentialError;

    const accessToken = this.generateAccessToken({
      sub: user.id,
    });

    const { sessionEntity, rawRefreshToken } = await this.sessionService.create(
      {
        userId: user.id,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    );

    return AuthMapper.toEntity({
      user,
      accessToken,
      rawRefreshToken,
      expiresAt: sessionEntity.expiresAt,
    });
  }

  async refresh(oldRawRefreshToken: string): Promise<AuthEntity> {
    const session =
      await this.sessionService.validateSession(oldRawRefreshToken);

    if (!session) {
      throw new AppBusinessException(
        {
          errorCode: ErrorCodes.NOT_FOUND,
          messages: [
            'No session related to the given refresh token has been found',
          ],
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.userService.getById(session.userId);

    if (!user) {
      throw new AppBusinessException(
        {
          errorCode: ErrorCodes.NOT_FOUND,
          messages: [
            'No user related to the given refresh token has been found',
          ],
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.sessionService.deleteByRefreshToken(oldRawRefreshToken);

    const accessToken = this.generateAccessToken({
      sub: user.id,
    });

    const { sessionEntity, rawRefreshToken } = await this.sessionService.create(
      {
        userId: user.id,
        userAgent: session.userAgent ?? undefined,
        ipAddress: session.ipAddress ?? undefined,
      },
    );

    return AuthMapper.toEntity({
      user: user,
      accessToken,
      rawRefreshToken,
      expiresAt: sessionEntity.expiresAt,
    });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.sessionService.deleteByRefreshToken(refreshToken);
  }
}
