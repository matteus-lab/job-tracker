import { plainToInstance } from 'class-transformer';
import { AuthResponseDto } from './schemas/dto/response/auth.response.dto';
import { AuthEntity } from './schemas/entities/auth.entity';
import { UserEntity } from 'src/modules/user/schemas/entities/user.entity';

export class AuthMapper {
  static toEntity(payload: {
    user: UserEntity;
    accessToken: string;
    rawRefreshToken: string;
    expiresAt: Date;
  }): AuthEntity {
    return new AuthEntity(payload);
  }

  static toResponseDto(authEntity: AuthEntity): AuthResponseDto {
    return plainToInstance(AuthResponseDto, authEntity, {
      excludeExtraneousValues: true,
    });
  }
}
