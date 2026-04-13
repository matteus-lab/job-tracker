import { Inject, Injectable } from '@nestjs/common';
import { SessionEntity } from '../domain/entities/session.entity';
import { SessionRepositoryPort } from '../domain/session.repository.port';
import { SessionMapper } from './session.mapper';
import {
  PERSISTENCE_PORT_TOKEN,
  type PersistencePort,
} from 'src/modules/persistence/domain/persistence.port';
import { PrismaClient } from '@generated/client';
import { CreateSessionPersistence } from '../domain/persistence/createSession.persistence';

@Injectable()
export class SessionRepository implements SessionRepositoryPort {
  constructor(
    @Inject(PERSISTENCE_PORT_TOKEN)
    private readonly persistenceAdapter: PersistencePort,
  ) {}

  private get client() {
    return this.persistenceAdapter.client as PrismaClient;
  }

  async create(data: CreateSessionPersistence): Promise<SessionEntity> {
    const sessionModel = await this.client.session.create({ data });

    return SessionMapper.toEntity(sessionModel);
  }

  async findByHashedRefreshToken(
    hashedRefreshToken: string,
  ): Promise<SessionEntity | null> {
    const sessionModel = await this.client.session.findUnique({
      where: {
        hashedRefreshToken,
      },
    });

    return sessionModel ? SessionMapper.toEntity(sessionModel) : null;
  }

  async deleteManyByHashedRefreshToken(
    hashedRefreshToken: string,
  ): Promise<void> {
    await this.client.session.deleteMany({
      where: {
        hashedRefreshToken,
      },
    });
  }

  async deleteAllExpired(): Promise<number> {
    const result = await this.client.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }
}
