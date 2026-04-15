import {
  BadRequestException,
  Body,
  Query,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { IsNumberString, IsString } from 'class-validator';
import { Exclude, Expose } from 'class-transformer';
import { Public } from 'src/core/infra/decorators/public.decorator';
import {
  ErrorCodes,
  BusinessError,
} from 'src/core/domain/errors/business.error';

class TestBodyDto {
  @IsString()
  name: string;
}

class TestQueryDto {
  @IsNumberString()
  age: string;
}

class TransformResponse {
  @Expose()
  type: string;

  @Expose()
  value: number;

  constructor(partial: Partial<TransformResponse>) {
    Object.assign(this, partial);
  }
}

class TestResponseDto {
  @Expose()
  id: number;

  @Expose()
  username: string;

  @Exclude()
  internalSecret: string;

  constructor(partial: Partial<TestResponseDto>) {
    Object.assign(this, partial);
  }
}

@Controller('dev')
export class DevController {
  @Public()
  @Get('trigger-business-error')
  triggerErrorBusiness() {
    throw new BusinessError({
      errorCode: ErrorCodes.USER_EMAIL_ALREADY_EXISTS,
      messages: ['Email already used'],
    });
  }

  @Public()
  @Get('trigger-nest-error-400')
  triggerNestError400() {
    throw new BadRequestException('Validation failed');
  }

  @Public()
  @Get('trigger-express-error')
  triggerExpressError() {
    const error = new Error('Technical error') as Error & {
      statusCode: number;
    };
    error.statusCode = 400;
    throw error;
  }

  @Public()
  @Get('trigger-express-error-no-message')
  triggerExpressErrorNoMessage() {
    const error = new Error() as Error & {
      statusCode: number;
    };
    error.statusCode = 400;
    throw error;
  }

  /*
   * Throw a new error that simulate a DB connection failed error with leaked data.
   * E2e test should send a generic message instead of the secret credentials leaked message
   */
  @Public()
  @Get('trigger-error-500')
  triggerError500() {
    throw new Error('Database connection failed - secret credentials leaked !');
  }

  @Public()
  @Post('test-body-validation')
  testBodyValidation(@Body() _body: TestBodyDto) {
    return { success: true };
  }

  @Public()
  @Get('test-query-validation')
  testQueryValidation(@Query() _query: TestQueryDto) {
    return { success: true };
  }

  @Public()
  @Get('test-transform')
  testTransform(@Query('age') age: number) {
    return new TransformResponse({
      type: typeof age,
      value: age,
    });
  }

  @Public()
  @Get('test-serialization')
  testSerialization(): TestResponseDto {
    return new TestResponseDto({
      id: 1,
      username: 'John Doe',
      internalSecret: 'top_secret_hush_hush',
    });
  }

  @Get('test-non-public-route')
  testNonPublicRoute() {
    return { success: true };
  }
}
