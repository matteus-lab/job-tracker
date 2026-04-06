import { CreateUserPersistence } from './schemas/persistence/createUser.persistence';
import { UserEntity } from './schemas/entities/user.entity';
import { UserWithPasswordEntity } from './schemas/entities/userWithPassword.entity';

export const IUSER_REPOSITORY_TOKEN = 'IUSER_REPOSITORY_TOKEN';

// [Port-Adapter] Define the port (interface) the adapter must implements
export interface IUserRepository {
  create(data: CreateUserPersistence): Promise<UserEntity>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmailWithPassword(
    email: string,
  ): Promise<UserWithPasswordEntity | null>;
}
