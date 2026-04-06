import { UserModel } from '@generated/models';

// mapper
import { UserMapper } from './user.mapper';

// schemas
import { UserEntity } from './schemas/entities/user.entity';
import { UserWithPasswordEntity } from './schemas/entities/userWithPassword.entity';
import { CreateUserInput } from './schemas/inputs/createUser.input';
import { UserResponseDto } from './schemas/dto/response/user.response.dto';

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

  describe('toPersistence', () => {
    it('should transform maximal input (Logic) into persistence (db)', () => {
      const persistenceUser = UserMapper.toPersistence(
        new CreateUserInput({
          email: 'JOHN@DOE.com',
          password: 'fake-password',
          lastname: 'Doe',
          firstname: 'John',
        }),
        {
          normalizedEmail: 'john@doe.com',
          hashedPassword: 'hash-password',
        },
      );

      expect(persistenceUser).toEqual({
        email: 'john@doe.com',
        password: 'hash-password',
        lastname: 'Doe',
        firstname: 'John',
      });
    });

    it('should transform minimal input (Logic) into persistence (db)', () => {
      const persistenceUser = UserMapper.toPersistence(
        new CreateUserInput({
          email: 'test@test.com',
          password: 'Password123!',
        }),
        {
          normalizedEmail: 'test@test.com',
          hashedPassword: 'hashed',
        },
      );

      expect(persistenceUser.lastname).toBeNull();
      expect(persistenceUser.firstname).toBeNull();
    });
  });

  describe('toEntity', () => {
    it('should transform a UserModel (db) into UserEntity (domain)', () => {
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
    it('should transform a UserModel (db) into UserWithPasswordEntity (domain)', () => {
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

  describe('toLog', () => {
    it('should transform a UserEntity (domain) into Log', () => {
      const result = UserMapper.toLog(USER_ENTITY_STUB);

      expect(result).toEqual({
        id: USER_ENTITY_STUB.id,
        email: USER_ENTITY_STUB.email,
      });
    });
  });

  describe('toResponseDto', () => {
    it('should transform a UserEntity (domain) into UserResponseDto (dto)', () => {
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
