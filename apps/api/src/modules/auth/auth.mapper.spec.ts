import ms from 'ms';
import { AuthMapper } from 'src/modules/auth/auth.mapper';

import { AuthResponseDto } from 'src/modules/auth/schemas/dto/response/auth.response.dto';
import { AuthEntity } from 'src/modules/auth/schemas/entities/auth.entity';
import { UserResponseDto } from 'src/modules/user/schemas/dto/response/user.response.dto';
import { UserEntity } from 'src/modules/user/schemas/entities/user.entity';

describe('AuthMapper', () => {
  const USER_ENTITY_STUB = new UserEntity({
    id: '5ba30bec-c177-4939-8c09-9882293e431f',
    email: 'john@doe.com',
    lastname: null,
    firstname: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  describe('toEntity', () => {
    it('should correctly assemble the AuthEntity', () => {
      const expiresAt = new Date(ms('7d'));

      const authEntity = AuthMapper.toEntity({
        user: USER_ENTITY_STUB,
        accessToken: 'header.payload.signature',
        rawRefreshToken: 'uuid-v4-token',
        expiresAt,
      });

      expect(authEntity).toBeInstanceOf(AuthEntity);
      expect(authEntity.accessToken).toBe('header.payload.signature');
      expect(authEntity.rawRefreshToken).toBe('uuid-v4-token');
      expect(authEntity.expiresAt).toBe(expiresAt);
    });
  });

  describe('toResponseDto', () => {
    const AUTH_ENTITY_STUB = new AuthEntity({
      user: USER_ENTITY_STUB,
      accessToken: 'header.payload.signature',
      rawRefreshToken: 'uuid-v4-token',
      expiresAt: new Date(),
    });

    it('should transform into AuthResponseDto and strip sensitive session data', () => {
      const result = AuthMapper.toResponseDto(AUTH_ENTITY_STUB);

      expect(result).toBeInstanceOf(AuthResponseDto);
      expect(result.user).toBeInstanceOf(UserResponseDto);
      expect(result.accessToken).toBe(AUTH_ENTITY_STUB.accessToken);
      expect(result).not.toHaveProperty('rawRefreshToken');
      expect(result).not.toHaveProperty('refreshToken');
      expect(result).not.toHaveProperty('expiresAt');
    });
  });
});
