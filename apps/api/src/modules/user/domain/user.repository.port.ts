import { UserEntity } from './entities/user.entity';
import { UserWithPasswordEntity } from './entities/userWithPassword.entity';
import { CreateUserPersistence } from './persistence/createUser.persistence';

export const USER_REPOSITORY_PORT_TOKEN = 'USER_REPOSITORY_PORT_TOKEN';

export interface UserRepositoryPort {
  create(persistence: CreateUserPersistence): Promise<UserEntity>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmailWithPassword(
    email: string,
  ): Promise<UserWithPasswordEntity | null>;
}
