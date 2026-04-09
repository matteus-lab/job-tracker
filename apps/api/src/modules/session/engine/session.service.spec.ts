/* eslint-disable @typescript-eslint/unbound-method */
import ms from 'ms';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  IHASHING_SERVICE_TOKEN,
  IHashingService,
} from 'src/modules/global/hashing/domain/hashing.service.interface';
import { SessionEntity } from '../domain/entities/session.entity';
import {
  ISESSION_REPOSITORY_TOKEN,
  ISessionRepository,
} from '../domain/session.repository.interface';
import { CreateSessionCommand } from './commands/createSession.command';
import { SessionService } from './session.service';

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
  let configService: jest.Mocked<ConfigService>;
  let hashingService: jest.Mocked<IHashingService>;
  let sessionRepository: jest.Mocked<ISessionRepository>;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: string) => defaultValue),
            getOrThrow: jest.fn(),
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
          provide: ISESSION_REPOSITORY_TOKEN,
          useValue: {
            create: jest.fn(),
            findByHashedRefreshToken: jest.fn(),
            deleteManyByHashedRefreshToken: jest.fn(),
            deleteAllExpired: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(SessionService);
    configService = module.get(ConfigService);
    hashingService = module.get(IHASHING_SERVICE_TOKEN);
    sessionRepository = module.get(ISESSION_REPOSITORY_TOKEN);
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
      hashingService.generateFingerprint.mockResolvedValue(hashToken);
      configService.get.mockReturnValue(duration);
      sessionRepository.create.mockResolvedValue(SESSION_ENTITY_STUB);

      const createSessionCommand = new CreateSessionCommand({
        userId: '5ba30bec-c177-4939-8c09-9882293e431f',
        userAgent: 'NestJS Test Runner',
        ipAddress: '123.456.7.89',
      });

      const result = await service.create(createSessionCommand);

      expect(hashingService.generateFingerprint).toHaveBeenCalledWith(rawToken);

      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hashedRefreshToken: hashToken,
          expiresAt: new Date(NOW.getTime() + ms(duration)),
        }),
      );

      expect(result.refreshToken).toBe(rawToken);
    });
  });

  describe('validateSession', () => {
    const rawToken = 'secret';
    const hashedToken = 'hashed';

    it('should return the session if valid and not expired', async () => {
      hashingService.generateFingerprint.mockResolvedValue(hashedToken);
      sessionRepository.findByHashedRefreshToken.mockResolvedValue(
        SESSION_ENTITY_STUB,
      );

      const result = await service.validateSession(rawToken);

      expect(
        sessionRepository.deleteManyByHashedRefreshToken,
      ).not.toHaveBeenCalled();

      expect(result).toEqual(SESSION_ENTITY_STUB);
    });

    it('should delete and return null if the session is expired', async () => {
      const expiredSession = new SessionEntity({
        ...SESSION_ENTITY_STUB,
        expiresAt: new Date(NOW.getTime() - 1000),
      });

      hashingService.generateFingerprint.mockResolvedValue(hashedToken);
      sessionRepository.findByHashedRefreshToken.mockResolvedValue(
        expiredSession,
      );

      const result = await service.validateSession(rawToken);

      expect(result).toBeNull();
      expect(
        sessionRepository.deleteManyByHashedRefreshToken,
      ).toHaveBeenCalledWith(hashedToken);
    });

    it('should return null if session does not exists', async () => {
      hashingService.generateFingerprint.mockResolvedValue(hashedToken);
      sessionRepository.findByHashedRefreshToken.mockResolvedValue(null);

      const result = await service.validateSession(rawToken);

      expect(result).toBeNull();
    });
  });

  describe('expiredSessionCleanup (cron)', () => {
    it('should call repository to delete all expired sessions', async () => {
      sessionRepository.deleteAllExpired.mockResolvedValue(10);

      await service.expiredSessionsCleanup();

      expect(sessionRepository.deleteAllExpired).toHaveBeenCalled();
    });

    it('should catch errors silently to prevent cron death', async () => {
      sessionRepository.deleteAllExpired.mockRejectedValue(
        new Error('DB error'),
      );

      jest.spyOn(service['logger'], 'error').mockImplementation(() => {});

      await expect(service.expiredSessionsCleanup()).resolves.not.toThrow();
    });
  });
});
