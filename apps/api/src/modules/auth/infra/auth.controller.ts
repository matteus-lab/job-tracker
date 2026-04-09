import type { Response } from 'express';
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
import { ConfigService } from '@nestjs/config';
import {
  AppBusinessException,
  ErrorCodes,
} from 'src/core/exceptions/business.exceptions';
import { Public } from 'src/core/decorators/public.decorator';
import { Cookies } from 'src/core/decorators/cookies.decorator';
import { AuthService } from '../engine/auth.service';
import { AuthMapper } from './auth.mapper';
import { AuthResponseDto } from 'src/modules/auth/infra/dto/response/auth.response.dto';
import { RegisterRequestDto } from 'src/modules/auth/infra/dto/request/register.request.dto';
import { LoginRequestDto } from 'src/modules/auth/infra/dto/request/login.request.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private setRefreshTokenCookie(
    res: Response,
    refreshToken: string,
    expiresAt: Date,
  ): void {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: this.configService.getOrThrow('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: expiresAt.getTime() - Date.now(),
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
    @Body() dto: RegisterRequestDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const authResult = await this.authService.register({
      email: dto.email,
      password: dto.password,
      lastname: dto.lastname,
      firstname: dto.firstname,
      ipAddress,
      userAgent,
    });

    this.setRefreshTokenCookie(
      res,
      authResult.refreshToken,
      authResult.expiresAt,
    );

    return AuthMapper.toResponseDto(authResult);
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
    @Body() dto: LoginRequestDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const authResult = await this.authService.login({
      email: dto.email,
      password: dto.password,
      ipAddress,
      userAgent,
    });

    this.setRefreshTokenCookie(
      res,
      authResult.refreshToken,
      authResult.expiresAt,
    );

    return AuthMapper.toResponseDto(authResult);
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

    const authResult = await this.authService.refresh(refreshToken);

    this.setRefreshTokenCookie(
      res,
      authResult.refreshToken,
      authResult.expiresAt,
    );

    return AuthMapper.toResponseDto(authResult);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout a user by invalidating their session' })
  async logout(
    @Cookies('refreshToken') refreshToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    this.clearRefreshTokenCookie(res);
  }
}
