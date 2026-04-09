export class SessionEntity {
  readonly id: string;
  readonly hashedRefreshToken: string;
  readonly userId: string;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
  readonly createdAt: Date;
  readonly expiresAt: Date;

  constructor(props: SessionEntity) {
    this.id = props.id;
    this.hashedRefreshToken = props.id;
    this.userId = props.userId;
    this.userAgent = props.userAgent;
    this.ipAddress = props.ipAddress;
    this.createdAt = props.createdAt;
    this.expiresAt = props.expiresAt;
  }
}
