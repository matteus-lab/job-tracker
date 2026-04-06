import { Inject, Injectable, Logger } from '@nestjs/common';

// Core
import {
  IHASHING_SERVICE_TOKEN,
  type IHashingService,
} from 'src/core/hashing/hashing.service.interface';

// User module
import { UserMapper } from './user.mapper';

// Schemas
import { CreateUserInput } from './schemas/inputs/createUser.input';
import { UserEntity } from './schemas/entities/user.entity';
import { UserWithPasswordEntity } from './schemas/entities/userWithPassword.entity';

import {
  IUSER_REPOSITORY_TOKEN,
  type IUserRepository,
} from './user.repository.interface';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(IHASHING_SERVICE_TOKEN)
    private readonly hashingService: IHashingService,
    @Inject(IUSER_REPOSITORY_TOKEN)
    private readonly repository: IUserRepository,
  ) {}

  async create(dto: CreateUserInput): Promise<UserEntity> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const hashedPassword = await this.hashingService.hash(dto.password);

    const data = UserMapper.toPersistence(dto, {
      normalizedEmail,
      hashedPassword,
    });

    const userEntity = await this.repository.create(data);

    this.logger.log(
      {
        method: this.create.name,
        user: UserMapper.toLog(userEntity),
      },
      'User created successfully',
    );

    return userEntity;
  }

  async getById(id: string): Promise<UserEntity | null> {
    const userEntity = await this.repository.findById(id);

    return userEntity;
  }

  /*
   *  We do not throw an AppBusinessException if the user doesn't exist
   *  to avoid enumeration attack
   */
  async getByEmailWithPassword(
    email: string,
  ): Promise<UserWithPasswordEntity | null> {
    const normalizedEmail = email.trim().toLowerCase();

    const userWithPasswordEntity =
      await this.repository.findByEmailWithPassword(normalizedEmail);

    return userWithPasswordEntity;
  }
}
