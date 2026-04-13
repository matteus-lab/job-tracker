import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from 'src/core/decorators/public.decorator';
import {
  AppBusinessException,
  ErrorCodes,
} from 'src/core/exceptions/business.exceptions';
import { JwtPayload } from 'src/core/types/jwt-payload.interface';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  private extractTokenFromHeader(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new AppBusinessException(
        {
          errorCode: ErrorCodes.AUTH_TOKEN_MISSING,
          messages: ['Token missing'],
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const payload: JwtPayload = await this.jwtService.verifyAsync(token);

      // injection inside @Req() req.user
      request['user'] = payload;

      return true;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new AppBusinessException(
          {
            errorCode: ErrorCodes.AUTH_TOKEN_EXPIRED,
            messages: ['Token has expired'],
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new AppBusinessException(
        {
          errorCode: ErrorCodes.AUTH_TOKEN_INVALID,
          messages: ['Invalid token'],
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
