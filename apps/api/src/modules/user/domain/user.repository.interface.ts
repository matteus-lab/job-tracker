import { UserEntity } from './entities/user.entity';
import { UserWithPasswordEntity } from './entities/userWithPassword.entity';

export const IUSER_REPOSITORY_TOKEN = 'IUSER_REPOSITORY_TOKEN';

export type UserDraft = {
  email: string;
  passwordHash: string;
  lastname?: string | null;
  firstname?: string | null;
};

export interface IUserRepository {
  create(data: UserDraft): Promise<UserEntity>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmailWithPassword(
    email: string,
  ): Promise<UserWithPasswordEntity | null>;
}
