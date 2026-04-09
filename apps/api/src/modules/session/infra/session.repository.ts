import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/global/database/infra/prisma/prisma.service';
import { SessionEntity } from '../domain/entities/session.entity';
import {
  ISessionRepository,
  type SessionDraft,
} from '../domain/session.repository.interface';
import { SessionMapper } from './session.mapper';

@Injectable()
export class SessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(sessionDraft: SessionDraft): Promise<SessionEntity> {
    const createSessionPersistence = SessionMapper.toPersistence(sessionDraft);

    const sessionModel = await this.prisma.client.session.create({
      data: createSessionPersistence,
    });

    return SessionMapper.toEntity(sessionModel);
  }

  async findByHashedRefreshToken(
    hashedRefreshToken: string,
  ): Promise<SessionEntity | null> {
    const sessionModel = await this.prisma.client.session.findUnique({
      where: {
        hashedRefreshToken,
      },
    });

    return sessionModel ? SessionMapper.toEntity(sessionModel) : null;
  }

  async deleteManyByHashedRefreshToken(
    hashedRefreshToken: string,
  ): Promise<void> {
    await this.prisma.client.session.deleteMany({
      where: {
        hashedRefreshToken,
      },
    });
  }

  async deleteAllExpired(): Promise<number> {
    const result = await this.prisma.client.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }
}
