import { SessionModel } from '@generated/models';
import { SessionEntity } from './schemas/entities/session.entity';
import { CreateSessionInput } from './schemas/inputs/createSession.input';
import { CreateSessionPersistence } from './schemas/persistence/createSession.persistence';

export class SessionMapper {
  // Logic > DB
  static toPersistence(
    input: CreateSessionInput,
    payload: {
      hashedRefreshToken: string;
      expiresAt: Date;
    },
  ): CreateSessionPersistence {
    return {
      hashedRefreshToken: payload.hashedRefreshToken,
      expiresAt: payload.expiresAt,

      userId: input.userId,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    };
  }

  // DB > Domain
  static toEntity(sessionModel: SessionModel): SessionEntity {
    return new SessionEntity({
      id: sessionModel.id,
      hashedRefreshToken: sessionModel.hashedRefreshToken,
      userId: sessionModel.userId,

      userAgent: sessionModel.userAgent,
      ipAddress: sessionModel.ipAddress,

      createdAt: sessionModel.createdAt,
      expiresAt: sessionModel.expiresAt,
    });
  }
}
