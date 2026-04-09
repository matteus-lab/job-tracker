import ms from 'ms';
import { SessionModel } from '@generated/models';
import { SessionEntity } from '../domain/entities/session.entity';
import { SessionMapper } from './session.mapper';
import { SessionDraft } from '../domain/session.repository.interface';

describe('SessionMapper', () => {
  const FIXED_DATE = new Date('2026-01-01T00:00:00Z');
  const EXPIRES_AT = new Date(FIXED_DATE.getTime() + ms('1w'));
  const HASHED_TOKEN = 'hashed_refresh_token';
  const USER_ID = '5ba30bec-c177-4939-8c09-9882293e431f';

  describe('toPersistence', () => {
    it('should transform maximal SessionDraft (domain) into persistence (infra)', () => {
      const sessionDraft: SessionDraft = {
        hashedRefreshToken: HASHED_TOKEN,
        userId: USER_ID,
        expiresAt: EXPIRES_AT,
        userAgent: 'NestJS Agent',
        ipAddress: '123.456.7.89',
      };

      const persistenceSession = SessionMapper.toPersistence(sessionDraft);

      expect(persistenceSession).toEqual({
        userId: USER_ID,
        hashedRefreshToken: HASHED_TOKEN,
        expiresAt: EXPIRES_AT,
        userAgent: 'NestJS Agent',
        ipAddress: '123.456.7.89',
      });
    });

    it('should transform minimal SessionDraft (domain) into persistence (infra)', () => {
      const sessionDraft: SessionDraft = {
        hashedRefreshToken: HASHED_TOKEN,
        userId: USER_ID,
        expiresAt: EXPIRES_AT,
      };

      const persistenceSession = SessionMapper.toPersistence(sessionDraft);

      expect(persistenceSession).toEqual({
        userId: USER_ID,
        hashedRefreshToken: HASHED_TOKEN,
        expiresAt: EXPIRES_AT,
        userAgent: null,
        ipAddress: null,
      });
    });
  });

  describe('toEntity', () => {
    it('should transform a SessionModel (infra) into SessionEntity (domain)', () => {
      const model: SessionModel = {
        id: '294ef3ec-3423-4178-8017-4c8e7a836081',
        hashedRefreshToken: 'fake_hashed',
        userId: '5ba30bec-c177-4939-8c09-9882293e431f',
        userAgent: null,
        ipAddress: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        expiresAt: new Date('2026-01-01T00:00:00Z'),
      };

      const entity = SessionMapper.toEntity(model);

      expect(entity).toBeInstanceOf(SessionEntity);
      expect(entity).toEqual(
        expect.objectContaining({
          id: model.id,
          userId: model.userId,
          expiresAt: model.expiresAt,
        }),
      );
    });
  });
});
