import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

import {
  IsEmail,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class RegisterRequestDto {
  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown),
  )
  @ApiProperty({ example: 'john@doe.com' })
  email: string;

  @IsStrongPassword()
  @ApiProperty({
    example: 'P@ssword123!',
    description: 'Min 8 chars, 1 upper, 1 lower, 1 number, 1 symbol.',
  })
  password: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @ApiPropertyOptional({ example: 'doe' })
  lastname?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @ApiPropertyOptional({ example: 'john' })
  firstname?: string;
}
