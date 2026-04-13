export const IHASHING_SERVICE_TOKEN = 'IHASHING_SERVICE_TOKEN';

export interface IHashingService {
  /**
   * High-security hash (Slow, Salt, Non-deterministic)
   * Usage : password, high security secrets
   */
  hash(data: string): Promise<string>;

  /**
   * Low-security hash (Fast and stable)
   * Usage : Search in DB fields (tokens, UUIDs, anonym index)
   */
  generateFingerprint(data: string): Promise<string>;

  /**
   * Verify the raw data with the given hash
   */
  verify(rawData: string, hash: string): Promise<boolean>;
}
