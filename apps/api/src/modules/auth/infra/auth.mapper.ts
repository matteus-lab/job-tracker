import { plainToInstance } from 'class-transformer';
import { AuthResult } from '../engine/auth.service';
import { AuthResponseDto } from 'src/modules/auth/infra/dto/response/auth.response.dto';

export const AuthMapper = {
  toResponseDto(authResult: AuthResult): AuthResponseDto {
    return plainToInstance(AuthResponseDto, authResult, {
      excludeExtraneousValues: true,
    });
  },
};
