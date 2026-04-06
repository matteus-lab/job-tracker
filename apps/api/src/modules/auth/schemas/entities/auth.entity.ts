import { UserEntity } from 'src/modules/user/schemas/entities/user.entity';

export class AuthEntity {
  readonly user: UserEntity;
  readonly accessToken: string;
  readonly rawRefreshToken: string;
  readonly expiresAt: Date;

  constructor(props: AuthEntity) {
    Object.assign(this, props);
  }
}
