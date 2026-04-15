/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

import { AuthController } from './auth.controller';
import { AuthResult, AuthService } from '../application/auth.service';
import { RegisterRequestDto } from 'src/modules/auth/infra/dto/request/register.request.dto';
import { SessionEntity } from 'src/modules/session/domain/entities/session.entity';
import { UserEntity } from 'src/modules/user/domain/entities/user.entity';
import { AuthResponseDto } from 'src/modules/auth/infra/dto/response/auth.response.dto';
import { LoginRequestDto } from 'src/modules/auth/infra/dto/request/login.request.dto';
import { AppBusinessException } from 'src/core/exceptions/business.exceptions';

const MOCK_RES = {
  cookie: jest.fn(),
} as unknown as Response;

const MOCK_DATE = new Date('2026-01-01T00:00:00Z');

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
  userAgent: 'Agent',
  ipAddress: '127.0.0.1',
  expiresAt: new Date(MOCK_DATE.getTime() + 1000 * 60 * 60 * 24 * 7), // 7d
  createdAt: new Date(),
});

const AUTH_RESULT: AuthResult = {
  user: USER_ENTITY_STUB,
  jwtToken: 'jwt',
  refreshToken: 'refresh',
  expiresAt: SESSION_ENTITY_STUB.expiresAt,
};

// Asserts
const assertRefreshTokenCookie = (
  res: Response,
  refreshToken: string,
  secure: boolean,
) => {
  expect(res.cookie).toHaveBeenCalledWith(
    'refreshToken',
    refreshToken,
    expect.objectContaining({
      httpOnly: true,
      secure,
      sameSite: 'strict',
      maxAge: SESSION_ENTITY_STUB.expiresAt.getTime() - MOCK_DATE.getTime(),
      path: '/api',
    }),
  );
};

describe('AuthController', () => {
  let authController: AuthController;
  let authService: jest.Mocked<AuthService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(MOCK_DATE);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: string) => defaultValue),
            getOrThrow: jest.fn(),
          },
        },
      ],
    }).compile();

    authController = module.get(AuthController);
    authService = module.get(AuthService);
    configService = module.get(ConfigService);
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
      configService.getOrThrow.mockReturnValue('production');
      authService.register.mockResolvedValue(AUTH_RESULT);

      const result = await authController.register(
        registerDto,
        'ip',
        'agent',
        MOCK_RES,
      );

      expect(authService.register).toHaveBeenCalled();
      assertRefreshTokenCookie(MOCK_RES, AUTH_RESULT.refreshToken, true);
      expect(result).toBeInstanceOf(AuthResponseDto);
    });
  });

  describe('login', () => {
    it('should delegate to auth service and set a secure cookie in production', async () => {
      configService.getOrThrow.mockReturnValue('production');
      authService.login.mockResolvedValue(AUTH_RESULT);

      const LoginDto: LoginRequestDto = {
        email: 'john@doe.com',
        password: 'Password123!',
      };

      const result = await authController.login(
        LoginDto,
        'ip',
        'agent',
        MOCK_RES,
      );

      expect(authService.login).toHaveBeenCalled();
      assertRefreshTokenCookie(MOCK_RES, AUTH_RESULT.refreshToken, true);
      expect(result).toBeInstanceOf(AuthResponseDto);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh, return new access token and set cookie refresh token', async () => {
      configService.getOrThrow.mockReturnValue('production');
      authService.refresh.mockResolvedValue(AUTH_RESULT);

      const result = await authController.refresh('token', MOCK_RES);

      expect(authService.refresh).toHaveBeenCalledWith('token');
      assertRefreshTokenCookie(MOCK_RES, AUTH_RESULT.refreshToken, true);
      expect(result).toBeInstanceOf(AuthResponseDto);
    });

    it('should throw AppBusinessException if cookie is missing', async () => {
      await expect(authController.refresh(undefined, MOCK_RES)).rejects.toThrow(
        AppBusinessException,
      );
      expect(authService.refresh).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear cookie and call service if token exists', async () => {
      configService.getOrThrow.mockReturnValue('production');

      await authController.logout('token', MOCK_RES);

      expect(authService.logout).toHaveBeenCalledWith('token');
      expect(MOCK_RES.cookie).toHaveBeenCalledWith(
        'refreshToken',
        '',
        expect.objectContaining({ maxAge: 0, secure: true }),
      );
    });

    it('should only clear cookie if token is missing', async () => {
      configService.getOrThrow.mockReturnValue('production');

      await authController.logout(undefined, MOCK_RES);

      expect(authService.logout).not.toHaveBeenCalled();
      expect(MOCK_RES.cookie).toHaveBeenCalledWith(
        'refreshToken',
        '',
        expect.objectContaining({ maxAge: 0, secure: true }),
      );
    });
  });
});
