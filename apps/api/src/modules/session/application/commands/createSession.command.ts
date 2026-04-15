export class CreateSessionCommand {
  readonly userId: string;
  readonly userAgent?: string | null;
  readonly ipAddress?: string | null;

  constructor(props: CreateSessionCommand) {
    this.userId = props.userId;
    this.userAgent = props.userAgent;
    this.ipAddress = props.ipAddress;
  }
}
