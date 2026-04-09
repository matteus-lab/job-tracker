import { SessionModel } from '@generated/models';
import { SessionEntity } from '../domain/entities/session.entity';
import { SessionDraft } from '../domain/session.repository.interface';
import { CreateSessionPersistence } from './persistence/createSession.persistence';

export const SessionMapper = {
  toPersistence(sessionDraft: SessionDraft): CreateSessionPersistence {
    return {
      ...sessionDraft,
      userAgent: sessionDraft.userAgent ?? null,
      ipAddress: sessionDraft.ipAddress ?? null,
    };
  },

  toEntity(sessionModel: SessionModel): SessionEntity {
    return new SessionEntity({ ...sessionModel });
  },
};
