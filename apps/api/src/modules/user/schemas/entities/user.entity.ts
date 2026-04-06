export class UserEntity {
  readonly id: string;
  readonly email: string;
  readonly lastname: string | null;
  readonly firstname: string | null;

  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;

  constructor(props: UserEntity) {
    Object.assign(this, props);
  }
}
