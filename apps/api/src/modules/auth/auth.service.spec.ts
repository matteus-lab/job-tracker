/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { IHASHING_SERVICE_TOKEN } from 'src/core/hashing/hashing.service.interface';
import { UserService } from 'src/modules/user/user.service';
import { SessionService } from 'src/modules/session/session.service';
import { RegisterRequestDto } from './schemas/dto/request/register.request.dto';
import { UserEntity } from 'src/modules/user/schemas/entities/user.entity';
import { SessionEntity } from 'src/modules/session/schemas/entities/session.entity';
import { AuthEntity } from './schemas/entities/auth.entity';
import { ITRANSACTION_MANAGER_TOKEN } from 'src/core/database/transaction-manager.interface';
import { LoginRequestDto } from './schemas/dto/request/login.request.dto';
import { UserWithPasswordEntity } from '../user/schemas/entities/userWithPassword.entity';
import {
  AppBusinessException,
  ErrorCodes,
} from 'src/core/exceptions/business.exceptions';
import { HttpStatus } from '@nestjs/common';

import {
  MOCK_JWT_SERVICE,
  MOCK_USER_SERVICE,
  MOCK_SESSION_SERVICE,
  MOCK_HASHING_SERVICE,
} from 'test/constants/mocks';

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

const SESSION_ENTITY_STUB = {
  rawRefreshToken: 'raw-token',
  sessionEntity: new SessionEntity({
    id: '294ef3ec-3423-4178-8017-4c8e7a836081',
    hashedRefreshToken: 'hash-token',
    userId: '5ba30bec-c177-4939-8c09-9882293e431f',
    userAgent: 'agent',
    ipAddress: '123.456.7.89',
    createdAt: NOW,
    expiresAt: NOW,
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: MOCK_JWT_SERVICE,
        },
        {
          provide: UserService,
          useValue: MOCK_USER_SERVICE,
        },
        {
          provide: SessionService,
          useValue: MOCK_SESSION_SERVICE,
        },
        {
          provide: IHASHING_SERVICE_TOKEN,
          useValue: MOCK_HASHING_SERVICE,
        },
        {
          provide: ITRANSACTION_MANAGER_TOKEN,
          useValue: {
            runInTransaction: (work: () => Promise<unknown>) => work(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    it('should orchestrate user creation, token generation and session creation', async () => {
      const dto: RegisterRequestDto = {
        email: 'john@doe.com',
        password: 'Password123!',
        lastname: 'Doe',
        firstname: 'John',
      };

      const metadata = {
        userAgent: 'agent',
        ipAddress: '123.456.7.89',
      };

      MOCK_USER_SERVICE.create.mockResolvedValue(USER_ENTITY_STUB);
      MOCK_JWT_SERVICE.sign.mockReturnValue('access-token');
      MOCK_SESSION_SERVICE.create.mockResolvedValue(SESSION_ENTITY_STUB);

      const result = await service.register(dto, metadata);

      expect(MOCK_USER_SERVICE.create).toHaveBeenCalledWith(dto);
      expect(MOCK_JWT_SERVICE.sign).toHaveBeenCalledWith({
        sub: USER_ENTITY_STUB.id,
      });
      expect(MOCK_SESSION_SERVICE.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ENTITY_STUB.id,
          ...metadata,
        }),
      );
      expect(result).toBeInstanceOf(AuthEntity);
    });
  });

  describe('login', () => {
    const dto: LoginRequestDto = {
      email: 'john@doe.com',
      password: 'Password123!',
    };

    it('should return an AuthEntity if password is valid', async () => {
      MOCK_USER_SERVICE.getByEmailWithPassword.mockResolvedValue(
        USER_WITH_PASSWORD_ENTITY_STUB,
      );
      MOCK_HASHING_SERVICE.verify.mockResolvedValue(true);
      MOCK_JWT_SERVICE.sign.mockReturnValue('access-token');
      MOCK_SESSION_SERVICE.create.mockResolvedValue(SESSION_ENTITY_STUB);

      const result = await service.login(dto);

      expect(MOCK_USER_SERVICE.getByEmailWithPassword).toHaveBeenCalledWith(
        dto.email,
      );
      expect(MOCK_HASHING_SERVICE.verify).toHaveBeenCalledWith(
        dto.password,
        USER_WITH_PASSWORD_ENTITY_STUB.password,
      );
      expect(result).toBeInstanceOf(AuthEntity);
      expect(result.accessToken).toBe('access-token');
    });

    it('should throw UNAUTHORIZED if user not found', async () => {
      MOCK_USER_SERVICE.getByEmailWithPassword.mockResolvedValue(null);

      const act = service.login(dto);

      await expect(act).rejects.toThrow(AppBusinessException);
      await expect(act).rejects.toMatchObject({
        response: {
          errorCode: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        },
      });
    });

    it('should throw UNAUTHORIZED if password does not match', async () => {
      MOCK_USER_SERVICE.getByEmailWithPassword.mockResolvedValue(
        USER_WITH_PASSWORD_ENTITY_STUB,
      );
      MOCK_HASHING_SERVICE.verify.mockResolvedValue(false);

      const act = service.login(dto);

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
      const oldRefreshToken = 'old-raw-refresh-token';
      const newRefreshToken = 'new-raw-refresh-token';

      MOCK_SESSION_SERVICE.validateSession.mockResolvedValue(
        OLD_SESSION_ENTITY_STUB,
      );

      MOCK_USER_SERVICE.getById.mockResolvedValue(USER_ENTITY_STUB);

      const fakeAccessToken = 'fake-jwt-token';
      MOCK_JWT_SERVICE.sign.mockReturnValue(fakeAccessToken);

      MOCK_SESSION_SERVICE.create.mockResolvedValue({
        rawRefreshToken: newRefreshToken,
        sessionEntity: NEW_SESSION_ENTITY_STUB,
      });

      const result = await service.refresh(oldRefreshToken);

      expect(MOCK_SESSION_SERVICE.validateSession).toHaveBeenCalledWith(
        oldRefreshToken,
      );

      expect(MOCK_USER_SERVICE.getById).toHaveBeenCalledWith(
        OLD_SESSION_ENTITY_STUB.userId,
      );

      expect(MOCK_SESSION_SERVICE.deleteByRefreshToken).toHaveBeenCalledWith(
        oldRefreshToken,
      );

      expect(MOCK_SESSION_SERVICE.create).toHaveBeenCalledWith({
        userId: USER_ENTITY_STUB.id,
        userAgent: OLD_SESSION_ENTITY_STUB.userAgent ?? undefined,
        ipAddress: OLD_SESSION_ENTITY_STUB.ipAddress ?? undefined,
      });

      expect(result).toBeInstanceOf(AuthEntity);
      expect(result.user).toEqual(USER_ENTITY_STUB);
      expect(result.accessToken).toBe(fakeAccessToken);
      expect(result.rawRefreshToken).toBe(newRefreshToken);
      expect(result.expiresAt).toBe(NEW_SESSION_ENTITY_STUB.expiresAt);
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

      MOCK_SESSION_SERVICE.validateSession.mockResolvedValue(
        OLD_SESSION_ENTITY_STUB_WITH_METADATA,
      );

      MOCK_USER_SERVICE.getById.mockResolvedValue(USER_ENTITY_STUB);

      const fakeAccessToken = 'fake-jwt-token';
      MOCK_JWT_SERVICE.sign.mockReturnValue(fakeAccessToken);

      MOCK_SESSION_SERVICE.create.mockResolvedValue({
        rawRefreshToken: 'new-refresh-token',
        sessionEntity: NEW_SESSION_ENTITY_STUB,
      });

      await service.refresh('old-token');

      expect(MOCK_SESSION_SERVICE.create).toHaveBeenCalledWith({
        userId: USER_ENTITY_STUB.id,
        userAgent: OLD_SESSION_ENTITY_STUB_WITH_METADATA.userAgent,
        ipAddress: OLD_SESSION_ENTITY_STUB_WITH_METADATA.ipAddress,
      });
    });

    it('should throw an error if given raw refresh token doesnt return any session', async () => {
      MOCK_SESSION_SERVICE.validateSession.mockResolvedValue(null);

      try {
        await service.refresh('wrong-token');
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

      await service.logout(refreshToken);

      expect(MOCK_SESSION_SERVICE.deleteByRefreshToken).toHaveBeenCalledWith(
        refreshToken,
      );
    });
  });
});
