import { SessionModel } from '@generated/models';
import { SessionEntity } from '../domain/entities/session.entity';
import { SessionMapper } from './session.mapper';

describe('SessionMapper', () => {
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
