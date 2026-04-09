import { SessionEntity } from './entities/session.entity';

export const ISESSION_REPOSITORY_TOKEN = 'ISESSION_REPOSITORY_TOKEN';

export type SessionDraft = {
  hashedRefreshToken: string;
  expiresAt: Date;
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export interface ISessionRepository {
  create(data: SessionDraft): Promise<SessionEntity>;

  findByHashedRefreshToken(
    hashedRefreshToken: string,
  ): Promise<SessionEntity | null>;

  deleteManyByHashedRefreshToken(hashedRefreshToken: string): Promise<void>;

  deleteAllExpired(): Promise<number>;
}
