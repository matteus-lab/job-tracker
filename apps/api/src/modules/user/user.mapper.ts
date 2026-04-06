import { UserModel } from '@generated/models';

// schemas
import { CreateUserInput } from './schemas/inputs/createUser.input';
import { CreateUserPersistence } from './schemas/persistence/createUser.persistence';
import { UserEntity } from './schemas/entities/user.entity';
import { UserWithPasswordEntity } from './schemas/entities/userWithPassword.entity';
import { UserResponseDto } from './schemas/dto/response/user.response.dto';
import { plainToInstance } from 'class-transformer';

export class UserMapper {
  // Logic > DB
  static toPersistence(
    input: CreateUserInput,
    payload: {
      normalizedEmail: string;
      hashedPassword: string;
    },
  ): CreateUserPersistence {
    return {
      email: payload.normalizedEmail,
      password: payload.hashedPassword,
      lastname: input.lastname ?? null,
      firstname: input.firstname ?? null,
    };
  }

  // DB > Domain
  static toEntity(userModel: UserModel): UserEntity {
    return new UserEntity({
      id: userModel.id,
      email: userModel.email,
      lastname: userModel.lastname,
      firstname: userModel.firstname,
      createdAt: userModel.createdAt,
      updatedAt: userModel.updatedAt,
      deletedAt: userModel.deletedAt,
    });
  }

  static toEntityWithPassword(userModel: UserModel): UserWithPasswordEntity {
    return new UserWithPasswordEntity({
      id: userModel.id,
      email: userModel.email,
      password: userModel.password,
      lastname: userModel.lastname,
      firstname: userModel.firstname,
      createdAt: userModel.createdAt,
      updatedAt: userModel.updatedAt,
      deletedAt: userModel.deletedAt,
    });
  }

  // Domain > Log
  static toLog(userEntity: UserEntity) {
    return {
      id: userEntity.id,
      email: userEntity.email,
    };
  }

  // Domain > Web
  static toResponseDto(userEntity: UserEntity): UserResponseDto {
    return plainToInstance(UserResponseDto, userEntity, {
      excludeExtraneousValues: true,
    });
  }
}
