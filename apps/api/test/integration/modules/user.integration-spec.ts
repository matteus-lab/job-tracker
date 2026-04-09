import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { UserModel } from '@generated/models';
import { AppModule } from 'src/app.module';
import { UUID_V4_REGEX } from 'test/constants/regex.constants';

import { PrismaService } from 'src/modules/global/database/infra/prisma/prisma.service';
import {
  AppBusinessException,
  ErrorCodes,
} from 'src/core/exceptions/business.exceptions';
import { UserEntity } from 'src/modules/user/domain/entities/user.entity';
import { UserWithPasswordEntity } from 'src/modules/user/domain/entities/userWithPassword.entity';
import {
  IUSER_REPOSITORY_TOKEN,
  UserDraft,
} from 'src/modules/user/domain/user.repository.interface';
import { CreateUserCommand } from 'src/modules/user/engine/commands/createUser.command';
import { UserService } from 'src/modules/user/engine/user.service';
import { UserRepository } from 'src/modules/user/infra/user.repository';

let INSERTED_USER: UserModel;

describe('User module integration', () => {
  let moduleFixture: TestingModule;
  let userService: UserService;
  let userRepository: UserRepository;
  let prismaService: PrismaService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    userService = moduleFixture.get<UserService>(UserService);
    userRepository = moduleFixture.get<UserRepository>(IUSER_REPOSITORY_TOKEN);
    prismaService = moduleFixture.get(PrismaService);
  });

  beforeEach(async () => {
    await prismaService.client.user.deleteMany();
    INSERTED_USER = await prismaService.client.user.create({
      data: {
        email: 'john@doe.com',
        password: 'hashed_password',
        lastname: 'Doe',
        firstname: 'John',
      },
    });
  });

  afterAll(async () => {
    await prismaService.onModuleDestroy();
    await moduleFixture.close();
  });

  describe('UserService', () => {
    describe('create', () => {
      it('should hash password and persist user correctly', async () => {
        const createUserCommand: CreateUserCommand = {
          email: 'new-user@domain.com',
          password: 'Password123!',
          lastname: 'New',
          firstname: 'User',
        };

        const result = await userService.create(createUserCommand);

        expect(result.email).toBe(createUserCommand.email);
        expect(result).toBeInstanceOf(UserEntity);

        const userInDb = await prismaService.client.user.findUnique({
          where: { id: result.id },
        });

        expect(userInDb).toBeDefined();
        expect(userInDb?.password).not.toBe(createUserCommand.password);
        expect(userInDb?.password).toMatch(/^\$argon2/);
      });

      it('should propagate conflict exception when email is already taken', async () => {
        const createUserCommand: CreateUserCommand = {
          email: INSERTED_USER.email,
          password: 'Password123!',
          lastname: 'New',
          firstname: 'User',
        };

        await expect(userService.create(createUserCommand)).rejects.toThrow(
          AppBusinessException,
        );

        try {
          await userService.create(createUserCommand);
          fail('service.create should trigger a conflict exception');
        } catch (error) {
          expect(error).toBeInstanceOf(AppBusinessException);

          const businessError = error as AppBusinessException;
          expect(businessError.getStatus()).toBe(HttpStatus.CONFLICT);
          expect(businessError.getResponse()).toMatchObject({
            errorCode: ErrorCodes.USER_EMAIL_ALREADY_EXISTS,
            messages: ['This email is already registered'],
            targetFields: ['email'],
          });
        }
      });
    });

    describe('getById', () => {
      it('should return user from database', async () => {
        const result = await userService.getById(INSERTED_USER.id);

        expect(result).toBeInstanceOf(UserEntity);
        expect(result?.email).toBe(INSERTED_USER.email);
        expect(result).not.toHaveProperty('password');
      });
    });

    describe('getByEmailWithPassword', () => {
      it('should return user with hashed password from database', async () => {
        const result = await userService.getByEmailWithPassword(
          INSERTED_USER.email.toUpperCase(),
        );

        expect(result).toBeInstanceOf(UserWithPasswordEntity);
        expect(result?.email).toBe(INSERTED_USER.email);
        expect(result?.password).toBe(INSERTED_USER.password);
      });

      it('should return null if user does not exist', async () => {
        const result =
          await userService.getByEmailWithPassword('unknown@user.com');
        expect(result).toBeNull();
      });
    });
  });

  describe('UserRepository', () => {
    describe('create', () => {
      const userDraf: UserDraft = {
        email: 'insert@me.com  ',
        passwordHash: 'hashed_password',
        lastname: 'Me',
        firstname: 'Insert',
      };

      it('should persist a user in the database and return a UserEntity', async () => {
        const result = await userRepository.create(userDraf);

        expect(result.id).toBeDefined();

        // Verify user persistence in the database
        const userInDb: UserModel | null =
          await prismaService.client.user.findUnique({
            where: { id: result.id },
          });

        expect(userInDb).toBeDefined();
        expect(userInDb?.id).toMatch(UUID_V4_REGEX);
        expect(userInDb?.email).toBe(userDraf.email);
        expect(userInDb?.password).toBe(userDraf.passwordHash);
        expect(userInDb?.lastname).toBe(userDraf.lastname);
        expect(userInDb?.firstname).toBe(userDraf.firstname);
        expect(userInDb?.createdAt).toBeInstanceOf(Date);
        expect(userInDb?.updatedAt).toBeInstanceOf(Date);
        expect(userInDb?.deletedAt).toBeNull();

        expect(result).toBeInstanceOf(UserEntity);
        expect(result).toEqual({
          id: userInDb?.id,
          email: userInDb?.email,
          lastname: userInDb?.lastname,
          firstname: userInDb?.firstname,
          createdAt: userInDb?.createdAt,
          updatedAt: userInDb?.updatedAt,
          deletedAt: userInDb?.deletedAt,
        });
      });

      it('should throw an AppConflictException when email violates unique constraint', async () => {
        try {
          await userRepository.create({
            email: INSERTED_USER.email,
            passwordHash: 'hashed',
            firstname: null,
            lastname: null,
          });
          fail('repository.create should trigger a conflict error on conflict');
        } catch (error) {
          expect(error).toBeInstanceOf(AppBusinessException);

          const businessError = error as AppBusinessException;
          const status = businessError.getStatus();
          const response = businessError.getResponse();

          expect(status).toBe(HttpStatus.CONFLICT);
          expect(response).toEqual({
            errorCode: ErrorCodes.USER_EMAIL_ALREADY_EXISTS,
            messages: ['This email is already registered'],
            targetFields: ['email'],
          });
        }
      });

      it('should re-throw unexpected errors', async () => {
        const unexpectedError = new Error('Unexpected DB crash');

        jest
          .spyOn(prismaService.client.user, 'create')
          .mockRejectedValueOnce(unexpectedError);

        await expect(userRepository.create(userDraf)).rejects.toThrow(
          'Unexpected DB crash',
        );
      });
    });

    describe('findById', () => {
      it('should return a UserEntity when user exists', async () => {
        const result = await userRepository.findById(INSERTED_USER.id);

        const { password: _password, ...insertedUserWithoutPassword } =
          INSERTED_USER;

        expect(result).toBeInstanceOf(UserEntity);
        expect(result).toEqual(insertedUserWithoutPassword);
        expect(result).not.toHaveProperty('password');
      });

      it('should return null when no user exists', async () => {
        const result = await userRepository.findById(
          '5e3bbb97-7dda-4b73-a707-0b2f6f30db23',
        );

        expect(result).toBeNull();
      });
    });

    describe('findByEmailWithPassword', () => {
      it('should return a UserWithPasswordEntity when user exists with the given email and password', async () => {
        const result = await userRepository.findByEmailWithPassword(
          INSERTED_USER.email,
        );

        expect(result).toBeInstanceOf(UserWithPasswordEntity);
        expect(result).toEqual({
          id: expect.stringMatching(UUID_V4_REGEX) as string,
          email: INSERTED_USER.email,
          password: INSERTED_USER.password,
          lastname: INSERTED_USER.lastname,
          firstname: INSERTED_USER.firstname,
          createdAt: expect.any(Date) as Date,
          updatedAt: expect.any(Date) as Date,
          deletedAt: null,
        });
      });

      it('should return null when no user exists with the given email', async () => {
        const result =
          await userRepository.findByEmailWithPassword('not@found.com');

        expect(result).toBeNull();
      });

      it('should not be case sensitive', async () => {
        const result = await userRepository.findByEmailWithPassword(
          INSERTED_USER.email.toUpperCase(),
        );

        expect(result).toBeInstanceOf(UserWithPasswordEntity);
        expect(result?.id).toBeDefined();
        expect(result?.email).toBe(INSERTED_USER.email);
      });
    });
  });
});
