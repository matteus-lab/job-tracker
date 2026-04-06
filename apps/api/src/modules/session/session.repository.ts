import { Injectable } from '@nestjs/common';
import { ISessionRepository } from './session.repository.interface';

// Prisma
import { PrismaService } from 'src/core/database/prisma/prisma.service';

// Mapper
import { SessionMapper } from './session.mapper';

// Schemas
import { CreateSessionPersistence } from './schemas/persistence/createSession.persistence';
import { SessionEntity } from './schemas/entities/session.entity';

@Injectable()
export class SessionRepository implements ISessionRepository {
  /* v8 ignore start */
  constructor(private readonly prisma: PrismaService) {}
  /* v8 ignore stop */

  async create(data: CreateSessionPersistence): Promise<SessionEntity> {
    const sessionModel = await this.prisma.client.session.create({ data });

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
