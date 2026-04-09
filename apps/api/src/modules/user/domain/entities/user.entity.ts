export class UserEntity {
  readonly id: string;
  readonly email: string;
  readonly lastname: string | null;
  readonly firstname: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;

  constructor(props: UserEntity) {
    this.id = props.id;
    this.email = props.email;
    this.lastname = props.lastname;
    this.firstname = props.firstname;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.deletedAt = props.deletedAt;
  }
}
