import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from 'src/modules/user/schemas/dto/response/user.response.dto';

export class AuthResponseDto {
  @Expose()
  @Type(() => UserResponseDto)
  @ApiProperty({
    example: UserResponseDto,
  })
  user: UserResponseDto;

  @Expose()
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30',
  })
  accessToken: string;
}
