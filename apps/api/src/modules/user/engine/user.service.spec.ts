/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import {
  IHASHING_SERVICE_TOKEN,
  IHashingService,
} from 'src/modules/global/hashing/domain/hashing.service.interface';

import {
  IUSER_REPOSITORY_TOKEN,
  IUserRepository,
} from '../domain/user.repository.interface';
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
  let userRepository: jest.Mocked<IUserRepository>;
  let hashingService: jest.Mocked<IHashingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: IUSER_REPOSITORY_TOKEN,
          useValue: {
            create: jest.fn(),
            findByEmailWithPassword: jest.fn(),
          },
        },
        {
          provide: IHASHING_SERVICE_TOKEN,
          useValue: {
            hash: jest.fn(),
          },
        },
      ],
    }).compile();

    userService = module.get(UserService);
    userRepository = module.get(IUSER_REPOSITORY_TOKEN);
    hashingService = module.get(IHASHING_SERVICE_TOKEN);
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

      hashingService.hash.mockResolvedValue(expectedHash);
      userRepository.create.mockResolvedValue(USER_ENTITY_STUB);

      await userService.create(createUserCommand);

      expect(hashingService.hash).toHaveBeenCalledWith('Password123!');

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@doe.com',
          passwordHash: expectedHash,
          lastname: undefined,
          firstname: undefined,
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
