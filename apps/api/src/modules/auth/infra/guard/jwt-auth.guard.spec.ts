import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, HttpStatus } from '@nestjs/common';
import {
  AppBusinessException,
  ErrorCodes,
} from 'src/core/exceptions/business.exceptions';
import { JwtPayload } from '../../domain/types/jwt-payload.interface';
import { Request } from 'express';

describe('jwtAuthGuard', () => {
  let jwtAuthGuard: JwtAuthGuard;
  let jwtService: JwtService;
  let reflector: Reflector;

  const mockContext = (req: Partial<Request>): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(req),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    jwtAuthGuard = module.get(JwtAuthGuard);
    jwtService = module.get(JwtService);
    reflector = module.get(Reflector);
  });

  it('should be defined', () => {
    expect(jwtAuthGuard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true if the route is marked as @Public', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await jwtAuthGuard.canActivate(mockContext({}));
      expect(result).toBe(true);
    });

    it('should throw AUTH_TOKEN_MISSING if token is missing', async () => {
      const req = { headers: {} };
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      try {
        await jwtAuthGuard.canActivate(mockContext(req));
      } catch (e) {
        const err = e as AppBusinessException;
        expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        expect(err.getResponse()).toMatchObject({
          errorCode: ErrorCodes.AUTH_TOKEN_MISSING,
        });
      }
    });

    it('should throw AUTH_TOKEN_EXPIRED if token is expired', async () => {
      const req = { headers: { authorization: 'Bearer expired-token' } };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const expiredError = new Error();
      expiredError.name = 'TokenExpiredError';
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(expiredError);

      try {
        await jwtAuthGuard.canActivate(mockContext(req));
      } catch (e) {
        const err = e as AppBusinessException;
        expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        expect(err.getResponse()).toMatchObject({
          errorCode: ErrorCodes.AUTH_TOKEN_EXPIRED,
        });
      }
    });

    it('should throw AUTH_TOKEN_INVALID if cant verify token', async () => {
      const req = { headers: { authorization: 'Bearer invalid-token' } };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockRejectedValue(new Error('Error'));

      try {
        await jwtAuthGuard.canActivate(mockContext(req));
      } catch (e) {
        const err = e as AppBusinessException;
        expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
        expect(err.getResponse()).toMatchObject({
          errorCode: ErrorCodes.AUTH_TOKEN_INVALID,
        });
      }
    });

    it('should return true and inject user if token is valid', async () => {
      const payload: JwtPayload = { sub: 'user-id', email: 'test@domain.com' };
      const req = { headers: { authorization: 'Bearer valid-token' } };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);

      const result = await jwtAuthGuard.canActivate(mockContext(req));

      expect(result).toBe(true);
      expect(req['user']).toEqual(payload);
    });
  });
});
