import { UserEntity } from './entities/user.entity';
import { UserWithPasswordEntity } from './entities/userWithPassword.entity';

export const USER_REPOSITORY_PORT_TOKEN = 'USER_REPOSITORY_PORT_TOKEN';

export type UserDraft = {
  email: string;
  passwordHash: string;
  lastname?: string | null;
  firstname?: string | null;
};

export interface UserRepositoryPort {
  create(data: UserDraft): Promise<UserEntity>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmailWithPassword(
    email: string,
  ): Promise<UserWithPasswordEntity | null>;
}
