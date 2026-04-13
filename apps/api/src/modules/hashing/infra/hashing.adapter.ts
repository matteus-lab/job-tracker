import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { HashingPort } from '../domain/hashing.port';

@Injectable()
export class HashingAdapter implements HashingPort {
  async hash(data: string): Promise<string> {
    return argon2.hash(data, {
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });
  }

  generateFingerprint(data: string): Promise<string> {
    const hash = createHash('sha256').update(data).digest('hex');
    return Promise.resolve(hash);
  }

  async verify(rawDta: string, hash: string): Promise<boolean> {
    if (hash.startsWith('$argon2')) {
      return argon2.verify(hash, rawDta);
    }

    const generatedHash = await this.generateFingerprint(rawDta);
    return generatedHash === hash;
  }
}
