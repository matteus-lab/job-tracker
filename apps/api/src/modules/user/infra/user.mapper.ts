import { UserModel } from '@generated/models';
import { plainToInstance } from 'class-transformer';
import { UserEntity } from '../domain/entities/user.entity';
import { UserWithPasswordEntity } from '../domain/entities/userWithPassword.entity';
import { UserResponseDto } from './dto/response/user.response.dto';

export const UserMapper = {
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
