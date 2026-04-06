/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterRequestDto } from './schemas/dto/request/register.request.dto';
import { AuthEntity } from './schemas/entities/auth.entity';
import { SessionEntity } from '../session/schemas/entities/session.entity';
import { UserEntity } from '../user/schemas/entities/user.entity';
import { AuthResponseDto } from './schemas/dto/response/auth.response.dto';
import { LoginRequestDto } from './schemas/dto/request/login.request.dto';
import { AppBusinessException } from 'src/core/exceptions/business.exceptions';
import {
  MOCK_AUTH_SERVICE,
  MOCK_CONFIG_SERVICE,
  MOCK_RES,
} from 'test/constants/mocks';

const MOCK_DATE = new Date('2026-01-01T00:00:00Z');

// Inputs
const METADATA = {
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent',
};

// Stubs
const USER_ENTITY_STUB = new UserEntity({
  id: '5ba30bec-c177-4939-8c09-9882293e431f',
  email: 'john@doe.com',
  lastname: 'Doe',
  firstname: 'John',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
});

const SESSION_ENTITY_STUB = new SessionEntity({
  id: '294ef3ec-3423-4178-8017-4c8e7a836081',
  userId: USER_ENTITY_STUB.id,
  hashedRefreshToken: 'hashedRefreshToken',
  userAgent: METADATA.userAgent,
  ipAddress: METADATA.ipAddress,
  expiresAt: new Date(MOCK_DATE.getTime() + 1000 * 60 * 60 * 24 * 7), // 7d
  createdAt: new Date(),
});

const AUTH_ENTITY_STUB = new AuthEntity({
  user: USER_ENTITY_STUB,
  accessToken: 'fakeAccessToken',
  rawRefreshToken: 'fakeRawRefreshToken',
  expiresAt: SESSION_ENTITY_STUB.expiresAt,
});

// Asserts
const assertRefreshTokenCookie = (
  res: Response,
  authEntity: AuthEntity,
  secure: boolean,
) => {
  expect(res.cookie).toHaveBeenCalledWith(
    'refreshToken',
    authEntity.rawRefreshToken,
    expect.objectContaining({
      httpOnly: true,
      secure,
      sameSite: 'strict',
      maxAge: AUTH_ENTITY_STUB.expiresAt.getTime() - MOCK_DATE.getTime(),
      path: '/api',
    }),
  );
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(MOCK_DATE);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: MOCK_AUTH_SERVICE,
        },
        {
          provide: ConfigService,
          useValue: MOCK_CONFIG_SERVICE,
        },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('register', () => {
    const registerDto: RegisterRequestDto = {
      email: 'john@doe.com',
      password: 'Password123!',
      firstname: 'John',
      lastname: 'Doe',
    };

    it('should delegate to service and set secure cookie in production', async () => {
      MOCK_CONFIG_SERVICE.getOrThrow.mockReturnValue('production');
      MOCK_AUTH_SERVICE.register.mockResolvedValue(AUTH_ENTITY_STUB);

      const result = await controller.register(
        registerDto,
        'ip',
        'agent',
        MOCK_RES,
      );

      expect(MOCK_AUTH_SERVICE.register).toHaveBeenCalled();
      assertRefreshTokenCookie(MOCK_RES, AUTH_ENTITY_STUB, true);
      expect(result).toBeInstanceOf(AuthResponseDto);
    });
  });

  describe('login', () => {
    it('should delegate to auth service and set a secure cookie in production', async () => {
      MOCK_CONFIG_SERVICE.getOrThrow.mockReturnValue('production');
      MOCK_AUTH_SERVICE.login.mockResolvedValue(AUTH_ENTITY_STUB);

      const LoginDto: LoginRequestDto = {
        email: 'john@doe.com',
        password: 'Password123!',
      };

      const result = await controller.login(LoginDto, 'ip', 'agent', MOCK_RES);

      expect(MOCK_AUTH_SERVICE.login).toHaveBeenCalled();
      assertRefreshTokenCookie(MOCK_RES, AUTH_ENTITY_STUB, true);
      expect(result).toBeInstanceOf(AuthResponseDto);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh, return new access token and set cookie refresh token', async () => {
      MOCK_CONFIG_SERVICE.getOrThrow.mockReturnValue('production');
      MOCK_AUTH_SERVICE.refresh.mockResolvedValue(AUTH_ENTITY_STUB);

      const result = await controller.refresh('token', MOCK_RES);

      expect(MOCK_AUTH_SERVICE.refresh).toHaveBeenCalledWith('token');
      assertRefreshTokenCookie(MOCK_RES, AUTH_ENTITY_STUB, true);
      expect(result).toBeInstanceOf(AuthResponseDto);
    });

    it('should throw AppBusinessException if cookie is missing', async () => {
      await expect(controller.refresh(undefined, MOCK_RES)).rejects.toThrow(
        AppBusinessException,
      );
      expect(MOCK_AUTH_SERVICE.refresh).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear cookie and call service if token exists', async () => {
      MOCK_CONFIG_SERVICE.getOrThrow.mockReturnValue('production');

      await controller.logout('token', MOCK_RES);

      expect(MOCK_AUTH_SERVICE.logout).toHaveBeenCalledWith('token');
      expect(MOCK_RES.cookie).toHaveBeenCalledWith(
        'refreshToken',
        '',
        expect.objectContaining({ maxAge: 0, secure: true }),
      );
    });

    it('should only clear cookie if token is missing', async () => {
      MOCK_CONFIG_SERVICE.getOrThrow.mockReturnValue('production');

      await controller.logout(undefined, MOCK_RES);

      expect(MOCK_AUTH_SERVICE.logout).not.toHaveBeenCalled();
      expect(MOCK_RES.cookie).toHaveBeenCalledWith(
        'refreshToken',
        '',
        expect.objectContaining({ maxAge: 0, secure: true }),
      );
    });
  });
});
