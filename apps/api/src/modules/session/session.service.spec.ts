/* eslint-disable @typescript-eslint/unbound-method */
import ms from 'ms';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IHASHING_SERVICE_TOKEN } from 'src/core/hashing/hashing.service.interface';
import { SessionService } from './session.service';
import { ISESSION_REPOSITORY_TOKEN } from './session.repository.interface';
import { SessionEntity } from './schemas/entities/session.entity';
import { CreateSessionInput } from './schemas/inputs/createSession.input';
import {
  MOCK_CONFIG_SERVICE,
  MOCK_HASHING_SERVICE,
  MOCK_SESSION_REPOSITORY,
} from 'test/constants/mocks';

const NOW = new Date();

const SESSION_ENTITY_STUB = new SessionEntity({
  id: '294ef3ec-3423-4178-8017-4c8e7a836081',
  hashedRefreshToken: 'fake_hashed',
  userId: '5ba30bec-c177-4939-8c09-9882293e431f',
  userAgent: null,
  ipAddress: null,
  expiresAt: new Date(NOW.getTime() + ms('7d')), // 7d
  createdAt: NOW,
});

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: ConfigService, useValue: MOCK_CONFIG_SERVICE },
        { provide: IHASHING_SERVICE_TOKEN, useValue: MOCK_HASHING_SERVICE },
        {
          provide: ISESSION_REPOSITORY_TOKEN,
          useValue: MOCK_SESSION_REPOSITORY,
        },
      ],
    }).compile();

    service = module.get(SessionService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('create', () => {
    it('should generate a secure session with correct expiration', async () => {
      const rawToken = '02471d40-740b-4ebd-9d84-d86fae87ed7b';
      const hashToken = 'hash-token';
      const duration = '1w';

      jest.spyOn(crypto, 'randomUUID').mockReturnValue(rawToken);
      MOCK_HASHING_SERVICE.generateFingerprint.mockResolvedValue(hashToken);
      MOCK_CONFIG_SERVICE.get.mockReturnValue(duration);
      MOCK_SESSION_REPOSITORY.create.mockResolvedValue(SESSION_ENTITY_STUB);

      const result = await service.create(
        new CreateSessionInput({
          userId: '5ba30bec-c177-4939-8c09-9882293e431f',
          userAgent: 'NestJS Test Runner',
          ipAddress: '123.456.7.89',
        }),
      );

      expect(MOCK_HASHING_SERVICE.generateFingerprint).toHaveBeenCalledWith(
        rawToken,
      );

      expect(MOCK_SESSION_REPOSITORY.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hashedRefreshToken: hashToken,
          expiresAt: new Date(NOW.getTime() + ms(duration)),
        }),
      );

      expect(result.rawRefreshToken).toBe(rawToken);
    });
  });

  describe('validateSession', () => {
    const rawToken = 'secret';
    const hashedToken = 'hashed';

    it('should return the session if valid and not expired', async () => {
      MOCK_HASHING_SERVICE.generateFingerprint.mockResolvedValue(hashedToken);
      MOCK_SESSION_REPOSITORY.findByHashedRefreshToken.mockResolvedValue(
        SESSION_ENTITY_STUB,
      );

      const result = await service.validateSession(rawToken);

      expect(
        MOCK_SESSION_REPOSITORY.deleteManyByHashedRefreshToken,
      ).not.toHaveBeenCalled();

      expect(result).toEqual(SESSION_ENTITY_STUB);
    });

    it('should delete and return null if the session is expired', async () => {
      const expiredSession = new SessionEntity({
        ...SESSION_ENTITY_STUB,
        expiresAt: new Date(NOW.getTime() - 1000),
      });

      MOCK_HASHING_SERVICE.generateFingerprint.mockResolvedValue(hashedToken);
      MOCK_SESSION_REPOSITORY.findByHashedRefreshToken.mockResolvedValue(
        expiredSession,
      );

      const result = await service.validateSession(rawToken);

      expect(result).toBeNull();
      expect(
        MOCK_SESSION_REPOSITORY.deleteManyByHashedRefreshToken,
      ).toHaveBeenCalledWith(hashedToken);
    });

    it('should return null if session does not exists', async () => {
      MOCK_HASHING_SERVICE.generateFingerprint.mockResolvedValue(hashedToken);
      MOCK_SESSION_REPOSITORY.findByHashedRefreshToken.mockResolvedValue(null);

      const result = await service.validateSession(rawToken);

      expect(result).toBeNull();
    });
  });

  describe('expiredSessionCleanup (cron)', () => {
    it('should call repository to delete all expired sessions', async () => {
      MOCK_SESSION_REPOSITORY.deleteAllExpired.mockResolvedValue(10);

      await service.expiredSessionsCleanup();

      expect(MOCK_SESSION_REPOSITORY.deleteAllExpired).toHaveBeenCalled();
    });

    it('should catch errors silently to prevent cron death', async () => {
      MOCK_SESSION_REPOSITORY.deleteAllExpired.mockRejectedValue(
        new Error('DB error'),
      );

      jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      await expect(service.expiredSessionsCleanup()).resolves.not.toThrow();
    });
  });
});
