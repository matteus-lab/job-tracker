import { SessionModel } from '@generated/models';
import { SessionEntity } from '../domain/entities/session.entity';

export const SessionMapper = {
  toEntity(sessionModel: SessionModel): SessionEntity {
    return new SessionEntity({ ...sessionModel });
  },
};
