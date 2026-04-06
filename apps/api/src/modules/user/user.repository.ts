import { HttpStatus, Injectable } from '@nestjs/common';

import { Prisma } from '@generated/client';
import { PrismaService } from 'src/core/database/prisma/prisma.service';

import {
  ErrorCodes,
  AppBusinessException,
} from 'src/core/exceptions/business.exceptions';

// User module
import { UserMapper } from './user.mapper';

// Schemas
import { UserEntity } from './schemas/entities/user.entity';
import { CreateUserPersistence } from './schemas/persistence/createUser.persistence';

import { IUserRepository } from './user.repository.interface';
import { UserWithPasswordEntity } from './schemas/entities/userWithPassword.entity';

// Adapter (implementation) of the Port IUserRepository
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserPersistence): Promise<UserEntity> {
    try {
      const userModel = await this.prisma.client.user.create({ data });

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
    const userModel = await this.prisma.client.user.findUnique({
      where: { id },
    });

    if (!userModel) return null;
    return UserMapper.toEntity(userModel);
  }

  async findByEmailWithPassword(
    email: string,
  ): Promise<UserWithPasswordEntity | null> {
    const userModel = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!userModel) return null;
    return UserMapper.toEntityWithPassword(userModel);
  }
}
