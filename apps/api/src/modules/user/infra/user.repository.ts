import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  ErrorCodes,
  AppBusinessException,
} from 'src/core/exceptions/business.exceptions';
import { Prisma, PrismaClient } from '@generated/client';
import { UserMapper } from './user.mapper';
import { UserEntity } from '../domain/entities/user.entity';
import { UserWithPasswordEntity } from '../domain/entities/userWithPassword.entity';
import { type UserRepositoryPort } from '../domain/user.repository.port';
import { CreateUserPersistence } from '../domain/persistence/createUser.persistence';
import {
  PERSISTENCE_PORT_TOKEN,
  type PersistencePort,
} from 'src/modules/persistence/domain/persistence.port';

@Injectable()
export class UserRepository implements UserRepositoryPort {
  constructor(
    @Inject(PERSISTENCE_PORT_TOKEN)
    private readonly persistenceAdapter: PersistencePort,
  ) {}

  private get db() {
    return this.persistenceAdapter.client as PrismaClient;
  }

  async create(data: CreateUserPersistence): Promise<UserEntity> {
    try {
      const userModel = await this.db.user.create({ data });

      return UserMapper.toEntity(userModel);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (
          e.code === 'P2002' && // P2002 is a unique constraint violation
          e.message.includes('email')
        )
          throw new AppBusinessException(
            {
              errorCode: ErrorCodes.USER_EMAIL_ALREADY_EXISTS,
              messages: ['This email is already registered'],
              targetFields: ['email'],
            },
            HttpStatus.CONFLICT,
          );
      }
      throw e;
    }
  }

  async findById(id: string): Promise<UserEntity | null> {
    const userModel = await this.db.user.findUnique({
      where: { id },
    });

    if (!userModel) return null;
    return UserMapper.toEntity(userModel);
  }

  async findByEmailWithPassword(
    email: string,
  ): Promise<UserWithPasswordEntity | null> {
    const userModel = await this.db.user.findUnique({
      where: { email },
    });

    if (!userModel) return null;
    return UserMapper.toEntityWithPassword(userModel);
  }
}
