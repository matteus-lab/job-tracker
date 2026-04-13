/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { HttpStatus } from '@nestjs/common';

import { AuthResult, AuthService } from './auth.service';
import {
  IHASHING_SERVICE_TOKEN,
  IHashingService,
} from 'src/modules/hashing/domain/hashing.service.interface';
import { UserService } from 'src/modules/user/engine/user.service';
import { SessionService } from 'src/modules/session/engine/session.service';
import { UserEntity } from 'src/modules/user/domain/entities/user.entity';
import { SessionEntity } from 'src/modules/session/domain/entities/session.entity';
import { ITRANSACTION_MANAGER_TOKEN } from 'src/modules/global/database/domain/transaction-manager.interface';
import { UserWithPasswordEntity } from 'src/modules/user/domain/entities/userWithPassword.entity';
import {
  AppBusinessException,
  ErrorCodes,
} from 'src/core/exceptions/business.exceptions';

import { RegisterCommand } from './commands/register.command';
import { LoginCommand } from './commands/login.command';

const NOW = new Date();

const USER_ENTITY_STUB = new UserEntity({
  id: '5ba30bec-c177-4939-8c09-9882293e431f',
  email: 'john@doe.com',
  lastname: 'Doe',
  firstname: 'John',
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
});

const USER_WITH_PASSWORD_ENTITY_STUB = new UserWithPasswordEntity({
  ...USER_ENTITY_STUB,
  password: 'hashed_password',
});

const SESSION_ENTITY_STUB = new SessionEntity({
  id: '294ef3ec-3423-4178-8017-4c8e7a836081',
  hashedRefreshToken: 'hash-token',
  userId: '5ba30bec-c177-4939-8c09-9882293e431f',
  userAgent: 'agent',
  ipAddress: '123.456.7.89',
  createdAt: NOW,
  expiresAt: NOW,
});

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: jest.Mocked<JwtService>;
  let userService: jest.Mocked<UserService>;
  let sessionService: jest.Mocked<SessionService>;
  let hashingService: jest.Mocked<IHashingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            getById: jest.fn(),
            getByEmailWithPassword: jest.fn(),
          },
        },
        {
          provide: SessionService,
          useValue: {
            create: jest.fn(),
            validateSession: jest.fn(),
            deleteByRefreshToken: jest.fn(),
          },
        },
        {
          provide: IHASHING_SERVICE_TOKEN,
          useValue: {
            hash: jest.fn(),
            generateFingerprint: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ITRANSACTION_MANAGER_TOKEN,
          useValue: {
            runInTransaction: (work: () => Promise<unknown>) => work(),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    jwtService = module.get(JwtService);
    userService = module.get(UserService);
    sessionService = module.get(SessionService);
    hashingService = module.get(IHASHING_SERVICE_TOKEN);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    it('should orchestrate user creation, session creation, token generation, and return a AuthResult', async () => {
      const registerCommand: RegisterCommand = {
        email: 'john@doe.com',
        password: 'Password123!',
        lastname: 'Doe',
        firstname: 'John',
        userAgent: 'agent',
        ipAddress: '123.456.7.89',
      };

      const jwtToken = 'jwt';
      const refreshToken = 'refresh';

      userService.create.mockResolvedValue(USER_ENTITY_STUB);
      sessionService.create.mockResolvedValue({
        sessionEntity: SESSION_ENTITY_STUB,
        refreshToken,
      });
      jwtService.sign.mockReturnValue(jwtToken);

      const result = await authService.register(registerCommand);

      expect(userService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerCommand.email,
          password: registerCommand.password,
          lastname: registerCommand.lastname,
          firstname: registerCommand.firstname,
        }),
      );

      expect(sessionService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ENTITY_STUB.id,
          userAgent: registerCommand.userAgent,
          ipAddress: registerCommand.ipAddress,
        }),
      );

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: USER_ENTITY_STUB.id,
        email: USER_ENTITY_STUB.email,
      });

      const expectedResult: AuthResult = {
        user: USER_ENTITY_STUB,
        jwtToken,
        refreshToken,
        expiresAt: SESSION_ENTITY_STUB.expiresAt,
      };

      expect(result).toEqual(expectedResult);
    });
  });

  describe('login', () => {
    const loginCommand: LoginCommand = {
      email: 'john@doe.com',
      password: 'Password123!',
    };

    it('should orchestrate sessionCreation, token generation, and return an AuthResult if password is valid', async () => {
      const jwtToken = 'jwt';
      const refreshToken = 'refresh';

      userService.getByEmailWithPassword.mockResolvedValue(
        USER_WITH_PASSWORD_ENTITY_STUB,
      );
      hashingService.verify.mockResolvedValue(true);
      sessionService.create.mockResolvedValue({
        sessionEntity: SESSION_ENTITY_STUB,
        refreshToken,
      });
      jwtService.sign.mockReturnValue(jwtToken);

      const result = await authService.login(loginCommand);

      expect(userService.getByEmailWithPassword).toHaveBeenCalledWith(
        loginCommand.email,
      );

      expect(hashingService.verify).toHaveBeenCalledWith(
        loginCommand.password,
        USER_WITH_PASSWORD_ENTITY_STUB.password,
      );

      const expectedResult: AuthResult = {
        user: USER_ENTITY_STUB,
        jwtToken,
        refreshToken,
        expiresAt: SESSION_ENTITY_STUB.expiresAt,
      };

      expect(result).toEqual(expectedResult);
    });

    it('should throw UNAUTHORIZED if user not found', async () => {
      userService.getByEmailWithPassword.mockResolvedValue(null);

      const act = authService.login(loginCommand);

      await expect(act).rejects.toThrow(AppBusinessException);
      await expect(act).rejects.toMatchObject({
        response: {
          errorCode: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        },
      });
    });

    it('should throw UNAUTHORIZED if password does not match', async () => {
      userService.getByEmailWithPassword.mockResolvedValue(
        USER_WITH_PASSWORD_ENTITY_STUB,
      );
      hashingService.verify.mockResolvedValue(false);

      const act = authService.login(loginCommand);

      await expect(act).rejects.toThrow(AppBusinessException);
      await expect(act).rejects.toMatchObject({
        response: {
          errorCode: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        },
      });
    });
  });

  describe('refresh', () => {
    const USER_ENTITY_STUB = new UserEntity({
      id: '5ba30bec-c177-4939-8c09-9882293e431f',
      email: 'john@doe.com',
      lastname: 'Doe',
      firstname: 'John',
      createdAt: new Date('2015-01-01T00:00:00Z'),
      updatedAt: new Date('2015-01-01T00:00:00Z'),
      deletedAt: null,
    });

    const OLD_SESSION_ENTITY_STUB = new SessionEntity({
      id: '294ef3ec-3423-4178-8017-4c8e7a836081',
      hashedRefreshToken: 'fake_hashed_1',
      userId: USER_ENTITY_STUB.id,
      userAgent: null,
      ipAddress: null,
      createdAt: new Date('2030-01-01T00:00:00Z'),
      expiresAt: new Date('2030-01-08T00:00:00Z'),
    });

    const NEW_SESSION_ENTITY_STUB = new SessionEntity({
      id: '294ef3ec-3423-4178-8017-4c8e7a836082',
      hashedRefreshToken: 'fake_hashed_2',
      userId: USER_ENTITY_STUB.id,
      userAgent: OLD_SESSION_ENTITY_STUB.userAgent,
      ipAddress: OLD_SESSION_ENTITY_STUB.ipAddress,
      createdAt: new Date('2030-01-02T00:00:00Z'),
      expiresAt: new Date('2030-01-09T00:00:00Z'),
    });

    it('should delete the previous session, create a new session and return the new AuthEntity', async () => {
      const jwtToken = 'fake-jwt-token';
      const oldRefreshToken = 'old-raw-refresh-token';
      const newRefreshToken = 'new-raw-refresh-token';

      sessionService.validateSession.mockResolvedValue(OLD_SESSION_ENTITY_STUB);

      userService.getById.mockResolvedValue(USER_ENTITY_STUB);

      jwtService.sign.mockReturnValue(jwtToken);

      sessionService.create.mockResolvedValue({
        sessionEntity: NEW_SESSION_ENTITY_STUB,
        refreshToken: newRefreshToken,
      });

      const result = await authService.refresh(oldRefreshToken);

      expect(sessionService.validateSession).toHaveBeenCalledWith(
        oldRefreshToken,
      );

      expect(userService.getById).toHaveBeenCalledWith(
        OLD_SESSION_ENTITY_STUB.userId,
      );

      expect(sessionService.deleteByRefreshToken).toHaveBeenCalledWith(
        oldRefreshToken,
      );

      expect(sessionService.create).toHaveBeenCalledWith({
        userId: USER_ENTITY_STUB.id,
        userAgent: OLD_SESSION_ENTITY_STUB.userAgent ?? undefined,
        ipAddress: OLD_SESSION_ENTITY_STUB.ipAddress ?? undefined,
      });

      const expectedResult: AuthResult = {
        user: USER_ENTITY_STUB,
        jwtToken,
        refreshToken: newRefreshToken,
        expiresAt: NEW_SESSION_ENTITY_STUB.expiresAt,
      };

      expect(result).toEqual(expectedResult);
    });

    it('should create a new session with old session userAgent and ipAddress', async () => {
      const OLD_SESSION_ENTITY_STUB_WITH_METADATA = new SessionEntity({
        id: '294ef3ec-3423-4178-8017-4c8e7a836081',
        hashedRefreshToken: 'fake_hashed_1',
        userId: USER_ENTITY_STUB.id,
        userAgent: 'Unit test user agent',
        ipAddress: '192.168.1.1',
        createdAt: new Date('2030-01-01T00:00:00Z'),
        expiresAt: new Date('2030-01-08T00:00:00Z'),
      });

      sessionService.validateSession.mockResolvedValue(
        OLD_SESSION_ENTITY_STUB_WITH_METADATA,
      );

      userService.getById.mockResolvedValue(USER_ENTITY_STUB);

      const fakeAccessToken = 'fake-jwt-token';
      jwtService.sign.mockReturnValue(fakeAccessToken);

      sessionService.create.mockResolvedValue({
        sessionEntity: NEW_SESSION_ENTITY_STUB,
        refreshToken: 'new-refresh-token',
      });

      await authService.refresh('old-token');

      expect(sessionService.create).toHaveBeenCalledWith({
        userId: USER_ENTITY_STUB.id,
        userAgent: OLD_SESSION_ENTITY_STUB_WITH_METADATA.userAgent,
        ipAddress: OLD_SESSION_ENTITY_STUB_WITH_METADATA.ipAddress,
      });
    });

    it('should throw an error if given raw refresh token doesnt return any session', async () => {
      sessionService.validateSession.mockResolvedValue(null);

      try {
        await authService.refresh('wrong-token');
        fail('service.refresh should trigger an error on wrong token');
      } catch (error) {
        expect(error).toBeInstanceOf(AppBusinessException);

        const businessError = error as AppBusinessException;
        const status = businessError.getStatus();
        const response = businessError.getResponse();

        expect(status).toBe(HttpStatus.UNAUTHORIZED);
        expect(response).toEqual({
          errorCode: ErrorCodes.NOT_FOUND,
          messages: [
            'No session related to the given refresh token has been found',
          ],
        });
      }
    });
  });

  describe('logout', () => {
    it('should call sessionService to delete the token', async () => {
      const refreshToken = 'raw-token';

      await authService.logout(refreshToken);

      expect(sessionService.deleteByRefreshToken).toHaveBeenCalledWith(
        refreshToken,
      );
    });
  });
});
