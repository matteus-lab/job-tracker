/* eslint-disable @typescript-eslint/unbound-method */

import { createHash } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaAdapter } from 'src/modules/persistence/infra/prisma.adapter';
import { SessionModel } from '@generated/models';

import { SessionEntity } from 'src/modules/session/domain/entities/session.entity';
import { SESSION_REPOSITORY_PORT_TOKEN } from 'src/modules/session/domain/session.repository.port';
import { CreateSessionCommand } from 'src/modules/session/engine/commands/createSession.command';
import { SessionService } from 'src/modules/session/engine/session.service';
import { CreateSessionPersistence } from 'src/modules/session/infra/persistence/createSession.persistence';
import { SessionRepository } from 'src/modules/session/infra/session.repository';
import { CreateUserPersistence } from 'src/modules/user/infra/persistence/createUser.persistence';

import { UUID_V4_REGEX } from 'test/constants/regex.constants';

describe('Session module integration', () => {
  let moduleFixture: TestingModule;
  let sessionService: SessionService;
  let sessionRepository: SessionRepository;
  let prisma: PrismaAdapter;

  let alreadyInsertedUserId: string;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    sessionService = moduleFixture.get<SessionService>(SessionService);
    sessionRepository = moduleFixture.get<SessionRepository>(
      SESSION_REPOSITORY_PORT_TOKEN,
    );
    prisma = moduleFixture.get(PrismaAdapter);
  });

  beforeEach(async () => {
    await prisma.client.session.deleteMany();
    await prisma.client.user.deleteMany();

    const userData: CreateUserPersistence = {
      email: 'john@doe.com',
      password: 'hashed',
      lastname: 'Doe',
      firstname: 'John',
    };

    const user = await prisma.client.user.create({
      data: userData,
    });

    alreadyInsertedUserId = user.id;
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await moduleFixture.close();
  });

  describe('SessionService', () => {
    describe('create', () => {
      it('should create a real session in DB with fingerprint and correct expiration', async () => {
        const input = new CreateSessionCommand({
          userId: alreadyInsertedUserId,
          userAgent: 'Integration-Test',
          ipAddress: '192.168.1.1',
        });

        const { sessionEntity, refreshToken } =
          await sessionService.create(input);

        expect(sessionEntity).toBeInstanceOf(SessionEntity);
        expect(refreshToken).toMatch(UUID_V4_REGEX);

        const sessionInDb = await prisma.client.session.findUnique({
          where: { id: sessionEntity.id },
        });

        expect(sessionInDb).toBeDefined();
        const expectedHash = createHash('sha256')
          .update(refreshToken)
          .digest('hex');
        expect(sessionInDb?.hashedRefreshToken).toBe(expectedHash);

        const now = new Date();
        expect(sessionInDb?.expiresAt.getTime()).toBeGreaterThan(now.getTime());
      });
    });

    describe('validateSession', () => {
      it('should return a SessionEntity if the refresh token exists and is not expired', async () => {
        const { refreshToken, sessionEntity } = await sessionService.create({
          userId: alreadyInsertedUserId,
          ipAddress: '127.0.0.1',
          userAgent: 'Test',
        });

        const result = await sessionService.validateSession(refreshToken);

        expect(result).toBeInstanceOf(SessionEntity);

        const inDb = await prisma.client.session.findUnique({
          where: { id: sessionEntity.id },
        });

        expect(inDb?.id).toBe(result?.id);
      });

      it('should reject an expired session even if the token exists in DB', async () => {
        const { refreshToken, sessionEntity } = await sessionService.create({
          userId: alreadyInsertedUserId,
          ipAddress: '127.0.0.1',
          userAgent: 'Test',
        });

        await prisma.client.session.update({
          where: { id: sessionEntity.id },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });

        const result = await sessionService.validateSession(refreshToken);

        expect(result).toBeNull();

        const inDb = await prisma.client.session.findUnique({
          where: { id: sessionEntity.id },
        });

        expect(inDb).toBeNull();
      });

      it('should return null if no session exists from given refresh token', async () => {
        const result = await sessionService.validateSession('rawRefreshToken');
        expect(result).toBeNull();
      });
    });

    describe('deleteByRefreshToken', () => {
      it('should delete the correct session using the raw token', async () => {
        const { refreshToken, sessionEntity } = await sessionService.create({
          userId: alreadyInsertedUserId,
          ipAddress: '1.1.1.1',
          userAgent: 'To-Delete',
        });

        await sessionService.deleteByRefreshToken(refreshToken);

        const sessionInDb = await prisma.client.session.findUnique({
          where: { id: sessionEntity.id },
        });
        expect(sessionInDb).toBeNull();
      });
    });

    describe('expiredSessionsCleanup', () => {
      it('should clean up sessions based on real DB time', async () => {
        await prisma.client.session.create({
          data: {
            userId: alreadyInsertedUserId,
            hashedRefreshToken: 'expired',
            expiresAt: new Date(Date.now() - 10000),
            ipAddress: '0.0.0.0',
            userAgent: 'Old',
          },
        });

        await sessionService.expiredSessionsCleanup();

        const count = await prisma.client.session.count();
        expect(count).toBe(0);
      });

      it('should catch and log an error if the repository fails', async () => {
        const dbError = new Error('Database connection lost');

        jest
          .spyOn(sessionRepository, 'deleteAllExpired')
          .mockRejectedValueOnce(dbError);

        const loggerErrorSpy = jest
          .spyOn(sessionService['logger'], 'error')
          .mockImplementation();

        await sessionService.expiredSessionsCleanup();

        expect(sessionRepository.deleteAllExpired).toHaveBeenCalled();

        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'Failed to cleanup expired sessions.',
          dbError.stack,
          expect.objectContaining({
            task: 'expiredSessionsCleanup',
            error: dbError.message,
          }),
        );

        loggerErrorSpy.mockRestore();
      });

      it('should handle and log non-Error exceptions correctly', async () => {
        const strangeError = 'Critical failure';

        jest
          .spyOn(sessionRepository, 'deleteAllExpired')
          .mockRejectedValueOnce(strangeError);

        const loggerErrorSpy = jest
          .spyOn(sessionService['logger'], 'error')
          .mockImplementation();

        await sessionService.expiredSessionsCleanup();

        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'Failed to cleanup expired sessions.',
          undefined,
          expect.objectContaining({
            error: strangeError,
          }),
        );

        loggerErrorSpy.mockRestore();
      });
    });
  });

  describe('SessionRepository', () => {
    describe('create', () => {
      it('should persist a session in the database and return a SessionEntity', async () => {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7);

        const persistenceData: CreateSessionPersistence = {
          userId: alreadyInsertedUserId,
          hashedRefreshToken: 'hashed',
          expiresAt: expirationDate,
          ipAddress: '127.0.0.1',
          userAgent: 'Jest Test',
        };

        const result = await sessionRepository.create(persistenceData);

        const sessionInDb: SessionModel | null =
          await prisma.client.session.findFirst({
            where: {
              userId: alreadyInsertedUserId,
            },
          });

        expect(sessionInDb).toBeDefined();
        expect(sessionInDb?.ipAddress).toBe(persistenceData.ipAddress);
        expect(sessionInDb?.hashedRefreshToken).toBe(
          persistenceData.hashedRefreshToken,
        );

        expect(result).toBeInstanceOf(SessionEntity);
        expect(result.id).toBe(sessionInDb?.id);
      });

      it('should fail if trying to add a session for a non-existant user', async () => {
        const persistenceData: CreateSessionPersistence = {
          userId: 'non-existant-uuid',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          expiresAt: new Date(),
          hashedRefreshToken: 'hashed',
        };

        await expect(
          sessionRepository.create(persistenceData),
        ).rejects.toThrow();
      });

      it('should allow multiple sessions for the same user', async () => {
        const session1: CreateSessionPersistence = {
          userId: alreadyInsertedUserId,
          hashedRefreshToken: 'hash_1',
          expiresAt: new Date(),
          ipAddress: '1.1.1.1',
          userAgent: 'PC',
        };

        const session2: CreateSessionPersistence = {
          userId: alreadyInsertedUserId,
          hashedRefreshToken: 'hash_2',
          expiresAt: new Date(),
          ipAddress: '2.2.2.2',
          userAgent: 'Mobile',
        };

        await sessionRepository.create(session1);
        await sessionRepository.create(session2);

        const sessionsInDb = await prisma.client.session.findMany({
          where: { userId: alreadyInsertedUserId },
        });

        expect(sessionsInDb).toHaveLength(2);
      });
    });

    describe('findByHashedRefreshToken', () => {
      it('should return a sessionEntity from given hashed refresh token', async () => {
        const hashedRefreshToken = 'to-delete';

        await sessionRepository.create({
          userId: alreadyInsertedUserId,
          hashedRefreshToken,
          expiresAt: new Date(Date.now() + 10000),
          ipAddress: '127.0.0.1',
          userAgent: 'Test',
        });

        const result =
          await sessionRepository.findByHashedRefreshToken(hashedRefreshToken);

        const sessionInDb = await prisma.client.session.findFirst({
          where: { hashedRefreshToken },
        });

        expect(sessionInDb).toBeDefined();
        expect(result).toBeInstanceOf(SessionEntity);
        expect(result?.id).toBe(sessionInDb?.id);
      });

      it('should return null if no session exist from given hashed refresh token', async () => {
        const hashedRefreshToken = 'to-delete';

        const result =
          await sessionRepository.findByHashedRefreshToken(hashedRefreshToken);

        expect(result).toBeNull();
      });
    });

    describe('deleteManyByHashedRefreshToken', () => {
      it('should delete a session by its hashed refresh token', async () => {
        const hashedRefreshToken = 'to-delete';

        await sessionRepository.create({
          userId: alreadyInsertedUserId,
          hashedRefreshToken,
          expiresAt: new Date(Date.now() + 10000),
          ipAddress: '127.0.0.1',
          userAgent: 'Test',
        });

        await sessionRepository.deleteManyByHashedRefreshToken(
          hashedRefreshToken,
        );

        const sessionInDb = await prisma.client.session.findFirst({
          where: { hashedRefreshToken },
        });

        expect(sessionInDb).toBeNull();
      });

      it('should not throw if the hashed refresh token does not exist', async () => {
        await expect(
          sessionRepository.deleteManyByHashedRefreshToken('non-existent'),
        ).resolves.not.toThrow();
      });
    });

    describe('deleteAllExpired', () => {
      it('should delete all expired sessions and return the count', async () => {
        const now = Date.now();

        // expired session
        await sessionRepository.create({
          userId: alreadyInsertedUserId,
          hashedRefreshToken: 'expired-1',
          expiresAt: new Date(now - 10000),
          ipAddress: '127.0.0.1',
          userAgent: 'Test',
        });

        // valid session
        await sessionRepository.create({
          userId: alreadyInsertedUserId,
          hashedRefreshToken: 'valid-1',
          expiresAt: new Date(now + 10000),
          ipAddress: '127.0.0.1',
          userAgent: 'Test',
        });

        const deletedCount = await sessionRepository.deleteAllExpired();
        expect(deletedCount).toBe(1);

        const sessions = await prisma.client.session.findMany({
          where: { userId: alreadyInsertedUserId },
        });

        expect(sessions).toHaveLength(1);
        expect(sessions[0].hashedRefreshToken).toBe('valid-1');
      });
    });
  });
});
