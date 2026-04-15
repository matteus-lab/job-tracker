export class RegisterCommand {
  readonly email: string;
  readonly password: string;
  readonly lastname?: string | null;
  readonly firstname?: string | null;
  readonly ipAddress?: string | null;
  readonly userAgent?: string | null;

  constructor(props: RegisterCommand) {
    this.email = props.email;
    this.password = props.password;
    this.lastname = props.lastname;
    this.firstname = props.firstname;
    this.ipAddress = props.ipAddress;
    this.userAgent = props.userAgent;
  }
}
