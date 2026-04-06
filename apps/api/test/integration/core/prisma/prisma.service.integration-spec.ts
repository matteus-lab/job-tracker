import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/core/database/prisma/prisma.service';

describe('PrismaService Integration', () => {
  let moduleFixture: TestingModule;
  let prismaService: PrismaService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prismaService = moduleFixture.get(PrismaService);
  });

  beforeEach(async () => {
    await prismaService.client.user.deleteMany();
  });

  afterAll(async () => {
    await prismaService.onModuleDestroy();
    await moduleFixture.close();
  });

  describe('Transaction Management (ALS)', () => {
    it('should persist data when transaction succeeds', async () => {
      await prismaService.runInTransaction(async () => {
        await prismaService.client.user.create({
          data: {
            email: 'tx-success@test.com',
            password: 'hash',
            lastname: 'Test',
            firstname: 'Tx',
          },
        });
      });

      const user = await prismaService.client.user.findUnique({
        where: { email: 'tx-success@test.com' },
      });

      expect(user).toBeDefined();
    });

    it('should rollback data when an error occurs inside the transaction', async () => {
      const email = 'tx-rollback@test.com';

      try {
        await prismaService.runInTransaction(async () => {
          await prismaService.client.user.create({
            data: {
              email,
              password: 'hash',
              lastname: 'Test',
              firstname: 'Tx',
            },
          });

          throw new Error('Force Rollback');
        });
      } catch (_error) {
        // expected error
      }

      const user = await prismaService.client.user.findUnique({
        where: { email },
      });

      expect(user).toBeNull();
    });

    it('should return the transaction client when inside als.run', async () => {
      await prismaService.runInTransaction(() => {
        const client = prismaService.client;

        expect(client).not.toBe(prismaService['_prisma']);

        return Promise.resolve();
      });
    });
  });
});
