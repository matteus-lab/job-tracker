export class CreateUserInput {
  public readonly email: string;
  public readonly password: string;
  public readonly lastname?: string;
  public readonly firstname?: string;

  constructor(props: CreateUserInput) {
    Object.assign(this, props);
  }
}
