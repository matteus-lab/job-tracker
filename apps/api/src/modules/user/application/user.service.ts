import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  HASHING_PORT_TOKEN,
  type HashingPort,
} from 'src/modules/hashing/domain/hashing.port';
import { UserEntity } from '../domain/entities/user.entity';
import { UserWithPasswordEntity } from '../domain/entities/userWithPassword.entity';
import {
  USER_REPOSITORY_PORT_TOKEN,
  type UserRepositoryPort,
} from '../domain/user.repository.port';
import { CreateUserCommand } from './commands/createUser.command';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(HASHING_PORT_TOKEN)
    private readonly hashingAdapter: HashingPort,
    @Inject(USER_REPOSITORY_PORT_TOKEN)
    private readonly userRepositoryAdapter: UserRepositoryPort,
  ) {}

  async create(command: CreateUserCommand): Promise<UserEntity> {
    const normalizedEmail = command.email.trim().toLowerCase();
    const hashedPassword = await this.hashingAdapter.hash(command.password);

    const userEntity = await this.userRepositoryAdapter.create({
      email: normalizedEmail,
      password: hashedPassword,
      lastname: command.lastname ?? null,
      firstname: command.firstname ?? null,
    });

    this.logger.log(
      {
        method: this.create.name,
        user: {
          id: userEntity.id,
          email: userEntity.email,
        },
      },
      'User created successfully',
    );

    return userEntity;
  }

  async getById(id: string): Promise<UserEntity | null> {
    const userEntity = await this.userRepositoryAdapter.findById(id);

    return userEntity;
  }

  /*
   *  We do not throw a BusinessError if the user doesn't exist
   *  to avoid enumeration attack
   */
  async getByEmailWithPassword(
    email: string,
  ): Promise<UserWithPasswordEntity | null> {
    const normalizedEmail = email.trim().toLowerCase();

    const userWithPasswordEntity =
      await this.userRepositoryAdapter.findByEmailWithPassword(normalizedEmail);

    return userWithPasswordEntity;
  }
}
