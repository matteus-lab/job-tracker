import { Test, TestingModule } from '@nestjs/testing';
import { HashingService } from './hashing.service';

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashingService],
    }).compile();

    service = module.get<HashingService>(HashingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hash', () => {
    it('should return a argon2 hash', async () => {
      const raw = 'data';

      const hash = await service.hash(raw);

      expect(hash).toContain('$argon2');
      expect(hash).not.toBe(raw);
    });

    it('should hash in a non-deterministic way', async () => {
      const raw = 'data';

      const hash = await service.hash(raw);
      const hash2 = await service.hash(raw);

      expect(hash).not.toBe(hash2);
    });
  });

  describe('generateFingerprint', () => {
    it('should return a sha256 hash', async () => {
      const raw = 'data';

      const hash = await service.generateFingerprint(raw);

      expect(hash).toHaveLength(64);
      expect(hash).not.toBe(raw);
    });

    it('should hash in a deterministic way', async () => {
      const raw = 'data';

      const hash = await service.generateFingerprint(raw);
      const hash2 = await service.generateFingerprint(raw);

      expect(hash).toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should verify hash()', async () => {
      const raw = 'data';

      const hash = await service.hash(raw);

      expect(await service.verify(raw, hash)).toBeTruthy();
      expect(await service.verify('different', hash)).toBeFalsy();
    });

    it('should verify generateFingerprint()', async () => {
      const raw = 'data';

      const hash = await service.generateFingerprint(raw);

      expect(await service.verify(raw, hash)).toBeTruthy();
      expect(await service.verify('different', hash)).toBeFalsy();
    });
  });
});
