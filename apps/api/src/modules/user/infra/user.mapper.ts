import { UserModel } from '@generated/models';
import { plainToInstance } from 'class-transformer';
import { UserEntity } from '../domain/entities/user.entity';
import { UserWithPasswordEntity } from '../domain/entities/userWithPassword.entity';
import { CreateUserPersistence } from './persistence/createUser.persistence';
import { UserResponseDto } from './dto/response/user.response.dto';
import { UserDraft } from '../domain/user.repository.port';

export const UserMapper = {
  toPersistence(userDraft: UserDraft): CreateUserPersistence {
    const { passwordHash, ...rest } = userDraft;

    return {
      ...rest,
      password: passwordHash,
      lastname: userDraft.lastname ?? null,
      firstname: userDraft.firstname ?? null,
    };
  },

  toEntity(userModel: UserModel): UserEntity {
    return new UserEntity({ ...userModel });
  },

  toEntityWithPassword(userModel: UserModel): UserWithPasswordEntity {
    return new UserWithPasswordEntity({ ...userModel });
  },

  toResponseDto(userEntity: UserEntity): UserResponseDto {
    return plainToInstance(UserResponseDto, userEntity, {
      excludeExtraneousValues: true,
    });
  },
};
