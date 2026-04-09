/**
 * Data for DB insertion.
 * @important The 'refresh token' field MUST be hashed before reaching this layer.
 */
export type CreateSessionPersistence = {
  hashedRefreshToken: string;
  expiresAt: Date;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
};
