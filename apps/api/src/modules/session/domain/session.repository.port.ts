import { SessionEntity } from './entities/session.entity';

export const SESSION_REPOSITORY_PORT_TOKEN = 'SESSION_REPOSITORY_PORT_TOKEN';

export type SessionDraft = {
  hashedRefreshToken: string;
  expiresAt: Date;
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export interface SessionRepositoryPort {
  create(data: SessionDraft): Promise<SessionEntity>;

  findByHashedRefreshToken(
    hashedRefreshToken: string,
  ): Promise<SessionEntity | null>;

  deleteManyByHashedRefreshToken(hashedRefreshToken: string): Promise<void>;

  deleteAllExpired(): Promise<number>;
}
