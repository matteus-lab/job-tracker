import { UserEntity } from './user.entity';

export class UserWithPasswordEntity extends UserEntity {
  readonly password: string;

  constructor(
    props: ConstructorParameters<typeof UserEntity>[0] & { password: string },
  ) {
    super(props);
    this.password = props.password;
  }
}
