import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';
import { configureApp } from 'src/configure-app';
import { ExceptionResponse } from 'src/core/exceptions/all-exceptions.filter';
import { ErrorCodes } from 'src/core/exceptions/business.exceptions';
import { RegisterRequestDto } from 'src/modules/auth/infra/dto/request/register.request.dto';
import { AuthResponseDto } from 'src/modules/auth/infra/dto/response/auth.response.dto';
import { UserResponseDto } from 'src/modules/user/infra/dto/response/user.response.dto';
import { PrismaService } from 'src/modules/global/database/infra/prisma/prisma.service';
import { ISO_DATE_REGEX, UUID_V4_REGEX } from 'test/constants/regex.constants';
import { LoginRequestDto } from 'src/modules/auth/infra/dto/request/login.request.dto';
import {
  IHASHING_SERVICE_TOKEN,
  IHashingService,
} from 'src/modules/global/hashing/domain/hashing.service.interface';
import { UserModel } from '@generated/models';

describe('Auth Module e2e', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;
  let hashingService: IHashingService;

  let INSERTED_USER: UserModel;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    configureApp(app);

    await app.init();

    prismaService = app.get(PrismaService);
    hashingService = app.get(IHASHING_SERVICE_TOKEN);
  });

  beforeEach(async () => {
    await prismaService.client.session.deleteMany();
    await prismaService.client.user.deleteMany();

    INSERTED_USER = await prismaService.client.user.create({
      data: {
        email: 'already@existing.com',
        password: await hashingService.hash('Password123!'),
        lastname: 'Already',
        firstname: 'existing',
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prismaService.onModuleDestroy();

    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    const route = '/api/v1/auth/register';

    describe('happy path', () => {
      it('Should register user and return tokens + user data', async () => {
        const payload: RegisterRequestDto = {
          email: 'JOHN@DOE.com',
          password: 'Password123!',
          lastname: 'Doe',
          firstname: 'John',
        };

        const response = await request(app.getHttpServer())
          .post(route)
          .send(payload)
          .expect(HttpStatus.CREATED);

        const cookies = response.get('Set-Cookie');
        expect(cookies).toBeDefined();

        const refreshCookie = cookies?.find((c) =>
          c.startsWith('refreshToken='),
        );
        expect(refreshCookie).toBeDefined();
        expect(refreshCookie).toMatch(
          /refreshToken=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
        );
        expect(refreshCookie).toContain('HttpOnly');
        expect(refreshCookie).not.toContain('Secure'); // test environment
        expect(refreshCookie).toContain('SameSite=Strict');
        expect(refreshCookie).toContain('Path=/api');
        expect(refreshCookie).toMatch(/Max-Age=\d+/);

        const body = response.body as AuthResponseDto;

        expect(body).toEqual<AuthResponseDto>({
          jwtToken: expect.stringMatching(
            /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/,
          ) as string,
          user: expect.objectContaining({
            id: expect.stringMatching(UUID_V4_REGEX) as string,
            email: payload.email.trim().toLowerCase(),
            lastname: payload.lastname,
            firstname: payload.firstname,
            createdAt: expect.stringMatching(ISO_DATE_REGEX) as Date,
            updatedAt: expect.stringMatching(ISO_DATE_REGEX) as Date,
            deletedAt: null,
          }) as UserResponseDto,
        });
      });
    });

    describe('error cases', () => {
      describe('email', () => {
        it('Should fail with 409 if email already exists', async () => {
          const payload: RegisterRequestDto = {
            email: INSERTED_USER.email,
            password: 'Password123!',
          };

          // second call to trigger conflict
          const response = await request(app.getHttpServer())
            .post(route)
            .send(payload)
            .expect(HttpStatus.CONFLICT);

          const body = response.body as ExceptionResponse;

          expect(body.statusCode).toBe(HttpStatus.CONFLICT);
          expect(body.errorCode).toBe(ErrorCodes.USER_EMAIL_ALREADY_EXISTS);
          expect(body.messages).toEqual(['This email is already registered']);
          expect(body.targetFields).toEqual(['email']);
        });

        it('Should fail with 400 if email is invalid', async () => {
          const response = await request(app.getHttpServer())
            .post(route)
            .send({
              email: 'not-an-email',
              password: 'Password123!',
            })
            .expect(HttpStatus.BAD_REQUEST);

          const body = response.body as ExceptionResponse;
          expect(body.messages).toEqual(['email must be an email']);
        });

        it('Should fail with 400 if email is missing', async () => {
          const response = await request(app.getHttpServer())
            .post(route)
            .send({ password: 'Password123!' })
            .expect(HttpStatus.BAD_REQUEST);

          const body = response.body as ExceptionResponse;
          expect(body.messages).toEqual(['email must be an email']);
        });
      });

      describe('password', () => {
        it.each([
          { password: 'password123!', reason: 'missing uppercase' },
          { password: 'PASSWORD123!', reason: 'missing lowercase' },
          { password: 'PasswordTest!', reason: 'missing number' },
          { password: 'Password1234', reason: 'missing special character' },
          { password: 'Pa1!', reason: 'below 8 characters' },
          { password: '', reason: 'is empty' },
        ])(
          'should fail with 400 if password is $reason',
          async ({ password }) => {
            const response = await request(app.getHttpServer())
              .post(route)
              .send({
                email: 'test@password.com',
                password,
              })
              .expect(HttpStatus.BAD_REQUEST);

            const body = response.body as ExceptionResponse;

            expect(body.messages).toEqual(['password is not strong enough']);
          },
        );
      });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const route = '/api/v1/auth/login';

    describe('happy path', () => {
      it('Should log in a user and return tokens + user data', async () => {
        const loginDto: LoginRequestDto = {
          email: INSERTED_USER.email,
          password: 'Password123!',
        };

        const loginResponse = await request(app.getHttpServer())
          .post(route)
          .send(loginDto)
          .expect(HttpStatus.OK);

        const cookies = loginResponse.get('Set-Cookie');
        expect(cookies).toBeDefined();

        const refreshCookie = cookies?.find((c) =>
          c.startsWith('refreshToken='),
        );
        expect(refreshCookie).toBeDefined();
        expect(refreshCookie).toMatch(
          /refreshToken=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
        );
        expect(refreshCookie).toContain('HttpOnly');
        expect(refreshCookie).not.toContain('Secure'); // test environment
        expect(refreshCookie).toContain('SameSite=Strict');
        expect(refreshCookie).toContain('Path=/api');
        expect(refreshCookie).toMatch(/Max-Age=\d+/);

        const loginBody = loginResponse.body as AuthResponseDto;

        expect(loginBody).toEqual<AuthResponseDto>({
          jwtToken: expect.stringMatching(
            /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/,
          ) as string,
          user: expect.objectContaining({
            id: expect.stringMatching(UUID_V4_REGEX) as string,
            email: loginDto.email.trim().toLowerCase(),
            lastname: INSERTED_USER.lastname,
            firstname: INSERTED_USER.firstname,
            createdAt: expect.stringMatching(ISO_DATE_REGEX) as Date,
            updatedAt: expect.stringMatching(ISO_DATE_REGEX) as Date,
            deletedAt: null,
          }) as UserResponseDto,
        });
      });
    });

    describe('failures path', () => {
      it('Should fail with UNAUTHORIZED AppBusinessException if email does not exist', async () => {
        const loginDto: LoginRequestDto = {
          email: 'ghost@not-found.com',
          password: 'Password123!',
        };

        const response = await request(app.getHttpServer())
          .post(route)
          .send(loginDto)
          .expect(HttpStatus.UNAUTHORIZED);

        const body = response.body as ExceptionResponse;
        expect(body.statusCode).toBe(HttpStatus.UNAUTHORIZED);
        expect(body.errorCode).toBe(ErrorCodes.AUTH_INVALID_CREDENTIALS);
        expect(body.messages).toEqual(['Invalid credentials']);
        expect(body.targetFields).toEqual(['email', 'password']);
      });

      it('Should fail with UNAUTHORIZED AppBusinessException if password is invalid', async () => {
        const loginDto: LoginRequestDto = {
          email: INSERTED_USER.email,
          password: 'Wr0ngP@ss!',
        };

        const loginResponse = await request(app.getHttpServer())
          .post(route)
          .send(loginDto)
          .expect(HttpStatus.UNAUTHORIZED);

        const body = loginResponse.body as ExceptionResponse;
        expect(body.statusCode).toBe(HttpStatus.UNAUTHORIZED);
        expect(body.errorCode).toBe(ErrorCodes.AUTH_INVALID_CREDENTIALS);
        expect(body.messages).toEqual(['Invalid credentials']);
        expect(body.targetFields).toEqual(['email', 'password']);
      });
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    const route = '/api/v1/auth/refresh';

    it('should refresh the session', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: INSERTED_USER.email,
          password: 'Password123!',
        })
        .expect(HttpStatus.OK);

      const loginBody = loginResponse.body as AuthResponseDto;

      const loginCookie = loginResponse.get('Set-Cookie');
      expect(loginCookie).toBeDefined();

      const loginCookieToken = loginCookie?.find((c) =>
        c.startsWith('refreshToken='),
      );

      // Wait to force different iat
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const refreshResponse = await request(app.getHttpServer())
        .post(route)
        .set('Cookie', loginCookie || [])
        .expect(HttpStatus.OK);

      const refreshBody = refreshResponse.body as AuthResponseDto;

      expect(refreshBody).toEqual<AuthResponseDto>({
        jwtToken: expect.stringMatching(
          /^[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+$/,
        ) as string,
        user: expect.objectContaining({
          id: expect.stringMatching(UUID_V4_REGEX) as string,
          email: INSERTED_USER.email.trim().toLowerCase(),
          lastname: INSERTED_USER.lastname,
          firstname: INSERTED_USER.firstname,
          createdAt: expect.stringMatching(ISO_DATE_REGEX) as Date,
          updatedAt: expect.stringMatching(ISO_DATE_REGEX) as Date,
          deletedAt: null,
        }) as UserResponseDto,
      });

      expect(refreshBody.jwtToken).not.toBe(loginBody.jwtToken);

      const refreshCookie = refreshResponse.get('Set-Cookie');
      expect(refreshCookie).toBeDefined();

      const refreshCookieToken = refreshCookie?.find((c) =>
        c.startsWith('refreshToken='),
      );

      expect(refreshCookieToken).not.toBe(loginCookieToken);
    });

    it('Should fail with UNAUTHORIZED AppBusinessException if refresh token is missing', async () => {
      const refreshResponse = await request(app.getHttpServer())
        .post(route)
        .expect(HttpStatus.UNAUTHORIZED);

      const body = refreshResponse.body as ExceptionResponse;
      expect(body.statusCode).toBe(HttpStatus.UNAUTHORIZED);
      expect(body.errorCode).toBe(ErrorCodes.UNAUTHORIZED);
      expect(body.messages).toEqual(['Unauthorized refresh action']);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    const route = '/api/v1/auth/logout';

    it('Should clear cookie and remove session from DB', async () => {
      // Login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: INSERTED_USER.email,
          password: 'Password123!',
        })
        .expect(HttpStatus.OK);

      const loginCookie = loginResponse.get('Set-Cookie');
      expect(loginCookie).toBeDefined();

      const sessionBefore = await prismaService.client.session.findFirst({
        where: { userId: INSERTED_USER.id },
      });
      expect(sessionBefore).toBeDefined();

      // Logout
      const logoutResponse = await request(app.getHttpServer())
        .post(route)
        .set('Cookie', loginCookie || [])
        .expect(HttpStatus.NO_CONTENT);

      const clearedCookies = logoutResponse.get('Set-Cookie');
      expect(clearedCookies).toBeDefined();

      const logoutCookie = clearedCookies?.find((c) =>
        c.startsWith('refreshToken=;'),
      );
      const isDeleted =
        logoutCookie?.includes('Max-Age=0') ||
        logoutCookie?.includes('Expires=Thu, 01 Jan 1970');

      expect(isDeleted).toBeTruthy();

      const sessionAfter = await prismaService.client.session.findFirst({
        where: { userId: INSERTED_USER.id },
      });
      expect(sessionAfter).toBeNull();
    });

    it('Should clear cookie even if no refreshToken is provided', async () => {
      const response = await request(app.getHttpServer())
        .post(route)
        .expect(HttpStatus.NO_CONTENT);

      const clearedCookies = response.get('Set-Cookie');
      expect(clearedCookies).toBeDefined();
      expect(clearedCookies?.some((c) => c.startsWith('refreshToken=;'))).toBe(
        true,
      );
    });
  });
});
