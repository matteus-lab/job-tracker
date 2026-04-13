import { CreateSessionPersistence } from '../infra/persistence/createSession.persistence';
import { SessionEntity } from './entities/session.entity';

export const SESSION_REPOSITORY_PORT_TOKEN = 'SESSION_REPOSITORY_PORT_TOKEN';

export interface SessionRepositoryPort {
  create(persistence: CreateSessionPersistence): Promise<SessionEntity>;

  findByHashedRefreshToken(
    hashedRefreshToken: string,
  ): Promise<SessionEntity | null>;

  deleteManyByHashedRefreshToken(hashedRefreshToken: string): Promise<void>;

  deleteAllExpired(): Promise<number>;
}
