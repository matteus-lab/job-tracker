import { CreateSessionPersistence } from './schemas/persistence/createSession.persistence';
import { SessionEntity } from './schemas/entities/session.entity';

export const ISESSION_REPOSITORY_TOKEN = 'ISESSION_REPOSITORY_TOKEN';

// [Port-Adapter] Define the port (interface) the adapter must implements
export interface ISessionRepository {
  create(data: CreateSessionPersistence): Promise<SessionEntity>;
  findByHashedRefreshToken(
    hashedRefreshToken: string,
  ): Promise<SessionEntity | null>;
  deleteManyByHashedRefreshToken(hashedRefreshToken: string): Promise<void>;
  deleteAllExpired(): Promise<number>;
}
