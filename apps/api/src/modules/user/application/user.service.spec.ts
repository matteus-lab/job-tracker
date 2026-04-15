/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import {
  HASHING_PORT_TOKEN,
  HashingPort,
} from 'src/modules/hashing/domain/hashing.port';

import {
  USER_REPOSITORY_PORT_TOKEN,
  UserRepositoryPort,
} from '../domain/user.repository.port';
import { UserEntity } from '../domain/entities/user.entity';
import { UserService } from './user.service';
import { CreateUserCommand } from './commands/createUser.command';

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
  let userService: UserService;
  let userRepository: jest.Mocked<UserRepositoryPort>;
  let hashingAdapter: jest.Mocked<HashingPort>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: USER_REPOSITORY_PORT_TOKEN,
          useValue: {
            create: jest.fn(),
            findByEmailWithPassword: jest.fn(),
          },
        },
        {
          provide: HASHING_PORT_TOKEN,
          useValue: {
            hash: jest.fn(),
          },
        },
      ],
    }).compile();

    userService = module.get(UserService);
    userRepository = module.get(USER_REPOSITORY_PORT_TOKEN);
    hashingAdapter = module.get(HASHING_PORT_TOKEN);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    it('should normalize email, hash password and call repository with mapped data', async () => {
      const createUserCommand = new CreateUserCommand({
        email: '  JOHN@doe.COM  ',
        password: 'Password123!',
      });

      const expectedHash = 'hashed_faked_password';

      hashingAdapter.hash.mockResolvedValue(expectedHash);
      userRepository.create.mockResolvedValue(USER_ENTITY_STUB);

      await userService.create(createUserCommand);

      expect(hashingAdapter.hash).toHaveBeenCalledWith('Password123!');

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@doe.com',
          password: expectedHash,
          lastname: null,
          firstname: null,
        }),
      );
    });
  });

  describe('getByEmailWithPassword', () => {
    it('should normalize email', async () => {
      const inputEmail = ' JOHN@DOE.COM  ';

      await userService.getByEmailWithPassword(inputEmail);

      expect(userRepository.findByEmailWithPassword).toHaveBeenCalledWith(
        'john@doe.com',
      );
    });
  });
});
