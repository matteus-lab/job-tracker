export type CreateSessionPersistence = {
  hashedRefreshToken: string;
  expiresAt: Date;
  userId: string;

  userAgent: string | null;
  ipAddress: string | null;
};
