import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/modules/global/database/infra/prisma/prisma.service';
import { AuthService } from 'src/modules/auth/engine/auth.service';
import { RegisterRequestDto } from 'src/modules/auth/infra/dto/request/register.request.dto';
import { SessionModel, UserModel } from '@generated/models';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from 'src/modules/session/engine/session.service';
import { ConfigService } from '@nestjs/config';
import { JWT_REGEX, UUID_V4_REGEX } from 'test/constants/regex.constants';
import { LoginRequestDto } from 'src/modules/auth/infra/dto/request/login.request.dto';
import {
  AppBusinessException,
  ErrorCodes,
} from 'src/core/exceptions/business.exceptions';
import { HttpStatus } from '@nestjs/common';
import { JwtPayload } from 'src/modules/auth/domain/types/jwt-payload.interface';
import { RegisterCommand } from 'src/modules/auth/engine/commands/register.command';
import { LoginCommand } from 'src/modules/auth/engine/commands/login.command';

describe('Auth module integration', () => {
  let moduleFixture: TestingModule;
  let authService: AuthService;
  let jwtService: JwtService;
  let sessionService: SessionService;
  let prismaService: PrismaService;
  let configService: ConfigService; // Declare ConfigService

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    authService = moduleFixture.get(AuthService);
    sessionService = moduleFixture.get(SessionService);
    jwtService = moduleFixture.get(JwtService);
    prismaService = moduleFixture.get(PrismaService);
    configService = moduleFixture.get(ConfigService); // Get ConfigService
  });

  beforeEach(async () => {
    await prismaService.client.session.deleteMany();
    await prismaService.client.user.deleteMany();
  });

  afterAll(async () => {
    await prismaService.onModuleDestroy();
    await moduleFixture.close();
  });

  describe('register', () => {
    const registerCommand: RegisterCommand = {
      email: 'integration@test.com',
      password: 'Password123!',
      lastname: 'Test',
      firstname: 'Integration',
      ipAddress: '127.0.0.1',
      userAgent: 'Jest Integration Test',
    };

    it('should successfully orchestrate the user creation and its associated session in the database', async () => {
      const result = await authService.register(registerCommand);

      // Verify user persistence in the database
      const userInDb: UserModel | null =
        await prismaService.client.user.findUnique({
          where: { email: registerCommand.email },
        });
      expect(userInDb).toBeDefined();

      // Verify session persistence in the database
      const sessionInDb: SessionModel | null =
        await prismaService.client.session.findFirst({
          where: {
            userId: userInDb?.id,
          },
        });
      expect(sessionInDb).toBeDefined();
      expect(sessionInDb?.ipAddress).toBe(registerCommand.ipAddress);
      expect(sessionInDb?.userAgent).toBe(registerCommand.userAgent);

      expect(result.user.email).toBe(userInDb?.email);
      expect(result.jwtToken).toMatch(JWT_REGEX);
      expect(result.refreshToken).toMatch(UUID_V4_REGEX);
      expect(result.expiresAt).toStrictEqual(sessionInDb?.expiresAt);

      const verifiedPayload: JwtPayload = await jwtService.verifyAsync(
        result.jwtToken,
        {
          secret: configService.getOrThrow<string>('JWT_SECRET'),
        },
      );

      expect(verifiedPayload).toMatchObject({
        sub: userInDb?.id,
        exp: expect.any(Number) as number,
        iat: expect.any(Number) as number,
      });
    });

    it('should rollback user creation if session creation fails', async () => {
      const registerDto: RegisterRequestDto = {
        email: 'rollback@test.com',
        password: 'Password123!',
        lastname: 'Rollback',
        firstname: 'Test',
      };

      jest
        .spyOn(sessionService, 'create')
        .mockRejectedValueOnce(new Error('Session creation failed'));

      // Attempt to register
      await expect(authService.register(registerDto)).rejects.toThrow(
        'Session creation failed',
      );

      const userInDb = await prismaService.client.user.findUnique({
        where: { email: registerDto.email },
      });
      expect(userInDb).toBeNull();
    });
  });

  describe('login', () => {
    it('should successfully log in an existing user and return a valid AuthEntity', async () => {
      const registerCommand: RegisterCommand = {
        email: 'john@doe.com',
        password: 'Password123!',
        ipAddress: '192.168.1.1',
        userAgent: 'Integration Test Browser 1',
      };

      const registeredUser = await authService.register(registerCommand);

      const loginCommand: LoginCommand = {
        ...registerCommand,
        ipAddress: '192.168.1.2',
        userAgent: 'Integration Test Browser 2',
      };

      const result = await authService.login(loginCommand);

      expect(result.user.id).toBe(registeredUser.user.id);
      expect(result.jwtToken).toMatch(JWT_REGEX);
      expect(result.refreshToken).toMatch(UUID_V4_REGEX);

      const sessionInDb = await prismaService.client.session.findFirst({
        where: { userId: result.user.id },
        orderBy: { createdAt: 'desc' }, // last created
      });

      expect(sessionInDb).toBeDefined();
      expect(sessionInDb?.ipAddress).toBe(loginCommand.ipAddress);
      expect(sessionInDb?.userAgent).toBe(loginCommand.userAgent);
      expect(result.expiresAt).toStrictEqual(sessionInDb?.expiresAt);
    });

    it('should throw UNAUTHORIZED if user does not exist', async () => {
      const loginDto: LoginRequestDto = {
        email: 'ghost@null.com',
        password: 'Password123!',
      };

      await expect(authService.login(loginDto)).rejects.toThrow(
        AppBusinessException,
      );
    });

    it('should throw UNAUTHORIZED if password is incorrect', async () => {
      const email = 'ghost@null.com';
      const registerDto: RegisterRequestDto = {
        email,
        password: 'Password123!',
      };

      await authService.register(registerDto);

      const loginDto: LoginRequestDto = {
        email,
        password: 'WrongP@ss123',
      };

      await expect(authService.login(loginDto)).rejects.toThrow(
        AppBusinessException,
      );
    });
  });

  describe('refresh', () => {
    const registerDto: RegisterRequestDto = {
      email: 'refresh@test.com',
      password: 'Password123!',
    };

    it('should refresh a session doing rotation : delete old, create new', async () => {
      const { refreshToken: oldRawToken, user } =
        await authService.register(registerDto);

      const sessionBefore = await prismaService.client.session.findFirst({
        where: { userId: user.id },
      });
      expect(sessionBefore).toBeDefined();

      const result = await authService.refresh(oldRawToken);

      expect(result.jwtToken).toBeDefined();
      expect(result.refreshToken).not.toBe(oldRawToken); // rotation
      expect(result.user.id).toBe(user.id);

      const oldSession = await prismaService.client.session.findFirst({
        where: { id: sessionBefore?.id },
      });
      expect(oldSession).toBeNull();

      const newSession = await prismaService.client.session.findFirst({
        where: { userId: user.id },
      });
      expect(newSession).toBeDefined();
      expect(newSession?.id).not.toBe(sessionBefore?.id);
    });

    it('should throw an error if session is not found (invalid token)', async () => {
      const invalidToken = '77777777-7777-7777-7777-777777777777';

      try {
        await authService.refresh(invalidToken);
      } catch (error) {
        expect(error).toBeInstanceOf(AppBusinessException);

        const businessError = error as AppBusinessException;
        const status = businessError.getStatus();
        const response = businessError.getResponse();

        expect(status).toBe(HttpStatus.UNAUTHORIZED);
        expect(response).toEqual({
          errorCode: ErrorCodes.NOT_FOUND,
          messages: [
            'No session related to the given refresh token has been found',
          ],
        });
      }
    });
  });

  describe('logout', () => {
    it('should successfully remove the session from the database', async () => {
      const registerDto: RegisterRequestDto = {
        email: 'logout@test.com',
        password: 'Password123!',
      };

      const { refreshToken, user } = await authService.register(registerDto);

      const sessionBefore = await prismaService.client.session.findFirst({
        where: { userId: user.id },
      });
      expect(sessionBefore).toBeDefined();

      await authService.logout(refreshToken);

      const sessionAfter = await prismaService.client.session.findFirst({
        where: { userId: user.id },
      });
      expect(sessionAfter).toBeNull();
    });

    it('should not throw if refresh token is invalid/non-existent', async () => {
      await expect(
        authService.logout('non-existent-token'),
      ).resolves.not.toThrow();
    });
  });
});
