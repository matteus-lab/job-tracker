import { UserModel } from '@generated/models';
import { UserEntity } from '../domain/entities/user.entity';
import { UserWithPasswordEntity } from '../domain/entities/userWithPassword.entity';
import { UserResponseDto } from './dto/response/user.response.dto';
import { UserMapper } from './user.mapper';

describe('UserMapper', () => {
  const USER_MODEL_STUB: UserModel = {
    id: '5ba30bec-c177-4939-8c09-9882293e431f',
    email: 'john@doe.com',
    password: 'fake_hashed_password',
    lastname: null,
    firstname: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  };

  const USER_ENTITY_STUB = new UserEntity({
    id: '5ba30bec-c177-4939-8c09-9882293e431f',
    email: 'john@doe.com',
    lastname: null,
    firstname: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  });

  describe('toEntity', () => {
    it('should transform a UserModel (infra) into UserEntity (domain)', () => {
      const entity = UserMapper.toEntity(USER_MODEL_STUB);

      expect(entity).toBeInstanceOf(UserEntity);
      expect(entity).not.toHaveProperty('password');
      expect(entity).toEqual({
        id: USER_MODEL_STUB.id,
        email: USER_MODEL_STUB.email,
        lastname: USER_MODEL_STUB.lastname,
        firstname: USER_MODEL_STUB.firstname,
        createdAt: USER_MODEL_STUB.createdAt,
        updatedAt: USER_MODEL_STUB.updatedAt,
        deletedAt: USER_MODEL_STUB.deletedAt,
      });
    });
  });

  describe('toEntityWithPassword', () => {
    it('should transform a UserModel (infra) into UserWithPasswordEntity (domain)', () => {
      const entity = UserMapper.toEntityWithPassword(USER_MODEL_STUB);

      expect(entity).toBeInstanceOf(UserWithPasswordEntity);
      expect(entity).toEqual({
        id: USER_MODEL_STUB.id,
        email: USER_MODEL_STUB.email,
        password: USER_MODEL_STUB.password,
        lastname: USER_MODEL_STUB.lastname,
        firstname: USER_MODEL_STUB.firstname,
        createdAt: USER_MODEL_STUB.createdAt,
        updatedAt: USER_MODEL_STUB.updatedAt,
        deletedAt: USER_MODEL_STUB.deletedAt,
      });
    });
  });

  describe('toResponseDto', () => {
    it('should transform a UserEntity (domain) into UserResponseDto (infra)', () => {
      const result = UserMapper.toResponseDto(USER_ENTITY_STUB);

      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result).not.toHaveProperty('password');
      expect(result).toEqual({
        id: USER_ENTITY_STUB.id,
        email: USER_ENTITY_STUB.email,
        lastname: USER_ENTITY_STUB.lastname,
        firstname: USER_ENTITY_STUB.firstname,
        createdAt: USER_ENTITY_STUB.createdAt,
        updatedAt: USER_ENTITY_STUB.updatedAt,
        deletedAt: USER_ENTITY_STUB.deletedAt,
      });
    });
  });
});
