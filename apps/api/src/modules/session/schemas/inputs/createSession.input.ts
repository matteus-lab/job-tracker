export class CreateSessionInput {
  readonly userId: string;
  readonly userAgent?: string;
  readonly ipAddress?: string;

  constructor(props: CreateSessionInput) {
    Object.assign(this, props);
  }
}
