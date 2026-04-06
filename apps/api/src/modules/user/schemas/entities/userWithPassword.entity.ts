import { UserEntity } from './user.entity';

export class UserWithPasswordEntity extends UserEntity {
  readonly password: string;

  constructor(
    data: ConstructorParameters<typeof UserEntity>[0] & { password: string },
  ) {
    super(data);
    this.password = data.password;
  }
}
