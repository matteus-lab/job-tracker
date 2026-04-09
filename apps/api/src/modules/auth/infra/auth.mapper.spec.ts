import ms from 'ms';
import { AuthMapper } from 'src/modules/auth/infra/auth.mapper';

import { AuthResult } from 'src/modules/auth/engine/auth.service';
import { AuthResponseDto } from 'src/modules/auth/infra/dto/response/auth.response.dto';
import { UserResponseDto } from 'src/modules/user/infra/dto/response/user.response.dto';
import { UserEntity } from 'src/modules/user/domain/entities/user.entity';

describe('AuthMapper', () => {
  describe('toResponseDto', () => {
    const authResult: AuthResult = {
      user: new UserEntity({
        id: '5ba30bec-c177-4939-8c09-9882293e431f',
        email: 'john@doe.com',
        lastname: null,
        firstname: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }),
      jwtToken: 'jwt',
      refreshToken: 'refresh',
      expiresAt: new Date(ms('7d')),
    };

    it('should transform into AuthResponseDto and strip sensitive session data', () => {
      const result = AuthMapper.toResponseDto(authResult);

      expect(result).toBeInstanceOf(AuthResponseDto);
      expect(result.user).toBeInstanceOf(UserResponseDto);
      expect(result.user.id).toBe(authResult.user.id);
      expect(result.user).not.toHaveProperty('password');
      expect(result.jwtToken).toBe(authResult.jwtToken);
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).not.toHaveProperty('expiresAt');
    });
  });
});
