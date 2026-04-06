import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  @ApiProperty({ example: '5ba30bec-c177-4939-8c09-9882293e431f' })
  readonly id: string;

  @Expose()
  @ApiProperty({ example: 'john@doe.com' })
  readonly email: string;

  @Expose()
  @ApiProperty({ type: 'string', example: 'doe', nullable: true })
  readonly lastname: string | null;

  @Expose()
  @ApiProperty({ type: 'string', example: 'doe', nullable: true })
  readonly firstname: string | null;

  @Expose()
  @ApiProperty({ example: '2024-01-26T12:00:00.000Z' })
  readonly createdAt: Date;

  @Expose()
  @ApiProperty({ example: '2024-01-26T12:00:00.000Z' })
  readonly updatedAt: Date;

  @Expose()
  @ApiProperty({ example: '2024-01-26T12:00:00.000Z' })
  readonly deletedAt: Date | null;
}
