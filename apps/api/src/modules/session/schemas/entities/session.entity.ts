export class SessionEntity {
  readonly id: string;
  readonly hashedRefreshToken: string;
  readonly userId: string;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
  readonly createdAt: Date;
  readonly expiresAt: Date;

  constructor(props: SessionEntity) {
    Object.assign(this, props);
  }
}
