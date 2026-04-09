import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ErrorCodes,
  AppBusinessException,
} from 'src/core/exceptions/business.exceptions';
import { Prisma } from '@generated/client';
import { PrismaService } from 'src/modules/global/database/infra/prisma/prisma.service';
import { UserMapper } from './user.mapper';
import { UserEntity } from '../domain/entities/user.entity';
import { UserWithPasswordEntity } from '../domain/entities/userWithPassword.entity';
import {
  IUserRepository,
  UserDraft,
} from '../domain/user.repository.interface';
import { CreateUserPersistence } from './persistence/createUser.persistence';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userDraft: UserDraft): Promise<UserEntity> {
    try {
      const createUserPersistence: CreateUserPersistence =
        UserMapper.toPersistence(userDraft);

      const userModel = await this.prisma.client.user.create({
        data: createUserPersistence,
      });

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
