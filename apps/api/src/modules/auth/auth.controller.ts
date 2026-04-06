import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

// Services
import { AuthService } from './auth.service';

// Mapper
import { AuthMapper } from './auth.mapper';

// DTOs
import { RegisterRequestDto } from './schemas/dto/request/register.request.dto';
import { AuthResponseDto } from './schemas/dto/response/auth.response.dto';
import { ConfigService } from '@nestjs/config';
import { LoginRequestDto } from './schemas/dto/request/login.request.dto';
import { AuthEntity } from './schemas/entities/auth.entity';
import {
  AppBusinessException,
  ErrorCodes,
} from 'src/core/exceptions/business.exceptions';
import { Public } from 'src/core/decorators/public.decorator';
import { Cookies } from 'src/core/decorators/cookies.decorator';

@Controller('auth')
export class AuthController {
  /* v8 ignore start */
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}
  /* v8 ignore stop */

  private setRefreshTokenCookie(res: Response, authEntity: AuthEntity): void {
    res.cookie('refreshToken', authEntity.rawRefreshToken, {
      httpOnly: true,
      secure: this.configService.getOrThrow('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: authEntity.expiresAt.getTime() - Date.now(),
      path: '/api',
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: this.configService.getOrThrow('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/api',
    });
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user.' })
  @ApiCreatedResponse({
    type: AuthResponseDto,
    description: 'The user has been successfully created with a new session.',
  })
  @ApiConflictResponse({ description: 'Email already exists' })
  async register(
    /* v8 ignore next */
    @Body() dto: RegisterRequestDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
    /* v8 ignore next */
  ): Promise<AuthResponseDto> {
    const authEntity: AuthEntity = await this.authService.register(dto, {
      ipAddress,
      userAgent,
    });

    this.setRefreshTokenCookie(res, authEntity);

    return AuthMapper.toResponseDto(authEntity);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login an existing user' })
  @ApiOkResponse({
    type: AuthResponseDto,
    description: 'The user has successfully login with a new session.',
  })
  @ApiUnauthorizedResponse({ description: 'Email or password invalid' })
  async login(
    /* v8 ignore next */
    @Body() dto: LoginRequestDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
    /* v8 ignore next */
  ): Promise<AuthResponseDto> {
    const authEntity: AuthEntity = await this.authService.login(dto, {
      ipAddress,
      userAgent,
    });

    this.setRefreshTokenCookie(res, authEntity);

    return AuthMapper.toResponseDto(authEntity);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh a user session' })
  async refresh(
    @Cookies('refreshToken') refreshToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!refreshToken) {
      throw new AppBusinessException(
        {
          errorCode: ErrorCodes.UNAUTHORIZED,
          messages: ['Unauthorized refresh action'],
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const authEntity = await this.authService.refresh(refreshToken);

    this.setRefreshTokenCookie(res, authEntity);

    return AuthMapper.toResponseDto(authEntity);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout a user by invalidating their session' })
  async logout(
    @Cookies('refreshToken') refreshToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
    /* v8 ignore next */
  ): Promise<void> {
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    this.clearRefreshTokenCookie(res);
  }
}
