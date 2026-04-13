import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import {
  AppBusinessException,
  ErrorCodes,
} from 'src/core/exceptions/business.exceptions';

import {
  ITRANSACTION_MANAGER_TOKEN,
  type ITransactionManager,
} from 'src/modules/global/database/domain/transaction-manager.interface';

import {
  HASHING_PORT_TOKEN,
  type HashingPort,
} from 'src/modules/hashing/domain/hashing.port';

import { JwtPayload } from 'src/modules/auth/domain/types/jwt-payload.interface';

import { UserWithPasswordEntity } from 'src/modules/user/domain/entities/userWithPassword.entity';
import { UserService } from 'src/modules/user/engine/user.service';
import { SessionService } from 'src/modules/session/engine/session.service';
import { RegisterCommand } from './commands/register.command';
import { UserEntity } from 'src/modules/user/domain/entities/user.entity';
import { LoginCommand } from './commands/login.command';

export type AuthResult = {
  user: UserEntity;
  jwtToken: string;
  refreshToken: string;
  expiresAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,

    @Inject(ITRANSACTION_MANAGER_TOKEN)
    private readonly txManager: ITransactionManager,

    @Inject(HASHING_PORT_TOKEN)
    private readonly hashingAdapter: HashingPort,
  ) {}

  private generateJwtToken(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  async register(command: RegisterCommand): Promise<AuthResult> {
    return await this.txManager.runInTransaction(async () => {
      const userEntity = await this.userService.create({
        email: command.email,
        password: command.password,
        lastname: command.lastname,
        firstname: command.firstname,
      });

      const { sessionEntity, refreshToken } = await this.sessionService.create({
        userId: userEntity.id,
        userAgent: command.userAgent,
        ipAddress: command.ipAddress,
      });

      const jwtToken = this.generateJwtToken({
        sub: userEntity.id,
        email: userEntity.email,
      });

      return {
        user: userEntity,
        jwtToken,
        refreshToken,
        expiresAt: sessionEntity.expiresAt,
      };
    });
  }

  async login(command: LoginCommand): Promise<AuthResult> {
    const invalidCredentialError = new AppBusinessException(
      {
        errorCode: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        messages: ['Invalid credentials'],
        targetFields: ['email', 'password'],
      },
      HttpStatus.UNAUTHORIZED,
    );

    const userWithPasswordEntity: UserWithPasswordEntity | null =
      await this.userService.getByEmailWithPassword(command.email);

    if (!userWithPasswordEntity) throw invalidCredentialError;

    const isPasswordValid = await this.hashingAdapter.verify(
      command.password,
      userWithPasswordEntity.password,
    );

    if (!isPasswordValid) throw invalidCredentialError;

    const userEntity = new UserEntity({ ...userWithPasswordEntity });

    const { sessionEntity, refreshToken } = await this.sessionService.create({
      userId: userWithPasswordEntity.id,
      userAgent: command.userAgent,
      ipAddress: command.ipAddress,
    });

    const jwtToken = this.generateJwtToken({
      sub: userWithPasswordEntity.id,
      email: userWithPasswordEntity.email,
    });

    return {
      user: userEntity,
      jwtToken,
      refreshToken,
      expiresAt: sessionEntity.expiresAt,
    };
  }

  async refresh(oldRefreshToken: string): Promise<AuthResult> {
    const session = await this.sessionService.validateSession(oldRefreshToken);

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

    const userEntity = await this.userService.getById(session.userId);

    if (!userEntity) {
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

    await this.sessionService.deleteByRefreshToken(oldRefreshToken);

    const jwtToken = this.generateJwtToken({
      sub: userEntity.id,
      email: userEntity.email,
    });

    const { sessionEntity, refreshToken } = await this.sessionService.create({
      userId: userEntity.id,
      userAgent: session.userAgent ?? undefined,
      ipAddress: session.ipAddress ?? undefined,
    });

    return {
      user: userEntity,
      jwtToken,
      refreshToken,
      expiresAt: sessionEntity.expiresAt,
    };
  }

  async logout(refreshToken: string) {
    await this.sessionService.deleteByRefreshToken(refreshToken);
  }
}
