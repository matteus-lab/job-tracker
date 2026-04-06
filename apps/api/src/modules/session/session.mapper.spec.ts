import ms from 'ms';
import { SessionModel } from '@generated/models';
import { SessionMapper } from './session.mapper';
import { SessionEntity } from './schemas/entities/session.entity';
import { CreateSessionInput } from './schemas/inputs/createSession.input';

describe('SessionMapper', () => {
  const FIXED_DATE = new Date('2026-01-01T00:00:00Z');
  const EXPIRES_AT = new Date(FIXED_DATE.getTime() + ms('1w'));
  const HASHED_TOKEN = 'hashed_refresh_token';
  const USER_ID = '5ba30bec-c177-4939-8c09-9882293e431f';

  describe('toPersistence', () => {
    it('should transform maximal input (Logic) into persistence (db)', () => {
      const inputMax = new CreateSessionInput({
        userId: USER_ID,
        userAgent: 'NestJS Agent',
        ipAddress: '123.456.7.89',
      });

      const resultMax = SessionMapper.toPersistence(inputMax, {
        hashedRefreshToken: HASHED_TOKEN,
        expiresAt: EXPIRES_AT,
      });

      expect(resultMax).toEqual({
        userId: USER_ID,
        hashedRefreshToken: HASHED_TOKEN,
        expiresAt: EXPIRES_AT,
        userAgent: 'NestJS Agent',
        ipAddress: '123.456.7.89',
      });
    });

    it('should transform minimal input (Logic) into persistence (db)', () => {
      const inputMin = new CreateSessionInput({ userId: USER_ID });

      const resultMin = SessionMapper.toPersistence(inputMin, {
        hashedRefreshToken: HASHED_TOKEN,
        expiresAt: EXPIRES_AT,
      });

      expect(resultMin).toEqual({
        userId: USER_ID,
        hashedRefreshToken: HASHED_TOKEN,
        expiresAt: EXPIRES_AT,
        userAgent: null,
        ipAddress: null,
      });
    });
  });

  describe('toEntity', () => {
    it('should transform a SessionModel into SessionEntity', () => {
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
