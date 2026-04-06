/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';

import { IHASHING_SERVICE_TOKEN } from 'src/core/hashing/hashing.service.interface';

// user module
import { UserService } from './user.service';
import { IUSER_REPOSITORY_TOKEN } from './user.repository.interface';

// schemas
import { UserEntity } from './schemas/entities/user.entity';
import { CreateUserInput } from './schemas/inputs/createUser.input';
import {
  MOCK_USER_REPOSITORY,
  MOCK_HASHING_SERVICE,
} from 'test/constants/mocks';

const USER_ENTITY_STUB = new UserEntity({
  id: '5ba30bec-c177-4939-8c09-9882293e431f',
  email: 'john@doe.com',
  lastname: null,
  firstname: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
});

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: IUSER_REPOSITORY_TOKEN, useValue: MOCK_USER_REPOSITORY },
        { provide: IHASHING_SERVICE_TOKEN, useValue: MOCK_HASHING_SERVICE },
      ],
    }).compile();

    service = module.get(UserService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('should normalize email, hash password and call repository with mapped data', async () => {
      const createUserInput = new CreateUserInput({
        email: '  JOHN@doe.COM  ',
        password: 'Password123!',
      });

      const expectedHash = 'hashed_faked_password';

      MOCK_HASHING_SERVICE.hash.mockResolvedValue(expectedHash);
      MOCK_USER_REPOSITORY.create.mockResolvedValue(USER_ENTITY_STUB);

      await service.create(createUserInput);

      expect(MOCK_HASHING_SERVICE.hash).toHaveBeenCalledWith('Password123!');

      expect(MOCK_USER_REPOSITORY.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@doe.com',
          password: expectedHash,
        }),
      );
    });
  });

  describe('getByEmailWithPassword', () => {
    it('should normalize email', async () => {
      const inputEmail = ' JOHN@DOE.COM  ';

      await service.getByEmailWithPassword(inputEmail);

      expect(MOCK_USER_REPOSITORY.findByEmailWithPassword).toHaveBeenCalledWith(
        'john@doe.com',
      );
    });
  });
});
