import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  HASHING_PORT_TOKEN,
  type HashingPort,
} from 'src/modules/hashing/domain/hashing.port';
import { UserEntity } from '../domain/entities/user.entity';
import { UserWithPasswordEntity } from '../domain/entities/userWithPassword.entity';
import {
  IUSER_REPOSITORY_TOKEN,
  type UserDraft,
  type IUserRepository,
} from '../domain/user.repository.interface';
import { CreateUserCommand } from './commands/createUser.command';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(HASHING_PORT_TOKEN)
    private readonly hashingAdapter: HashingPort,
    @Inject(IUSER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  async create(command: CreateUserCommand): Promise<UserEntity> {
    const normalizedEmail = command.email.trim().toLowerCase();
    const hashedPassword = await this.hashingAdapter.hash(command.password);

    const userDraft: UserDraft = {
      email: normalizedEmail,
      passwordHash: hashedPassword,
      lastname: command.lastname,
      firstname: command.firstname,
    };

    const userEntity = await this.userRepository.create(userDraft);

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
    const userEntity = await this.userRepository.findById(id);

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
      await this.userRepository.findByEmailWithPassword(normalizedEmail);

    return userWithPasswordEntity;
  }
}
