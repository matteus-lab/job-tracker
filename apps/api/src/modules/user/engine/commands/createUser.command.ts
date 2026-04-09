export class CreateUserCommand {
  readonly email: string;
  readonly password: string;
  readonly lastname?: string | null;
  readonly firstname?: string | null;

  constructor(props: CreateUserCommand) {
    this.email = props.email;
    this.password = props.password;
    this.lastname = props.lastname;
    this.firstname = props.firstname;
  }
}
