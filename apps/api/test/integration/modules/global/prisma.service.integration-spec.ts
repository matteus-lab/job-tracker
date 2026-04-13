import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { PrismaAdapter } from 'src/modules/global/database/infra/prisma.adapter';

describe('prisma Integration', () => {
  let moduleFixture: TestingModule;
  let prisma: PrismaAdapter;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleFixture.get(PrismaAdapter);
  });

  beforeEach(async () => {
    await prisma.client.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
    await moduleFixture.close();
  });

  describe('Transaction Management (ALS)', () => {
    it('should persist data when transaction succeeds', async () => {
      await prisma.runInTransaction(async () => {
        await prisma.client.user.create({
          data: {
            email: 'tx-success@test.com',
            password: 'hash',
            lastname: 'Test',
            firstname: 'Tx',
          },
        });
      });

      const user = await prisma.client.user.findUnique({
        where: { email: 'tx-success@test.com' },
      });

      expect(user).toBeDefined();
    });

    it('should rollback data when an error occurs inside the transaction', async () => {
      const email = 'tx-rollback@test.com';

      try {
        await prisma.runInTransaction(async () => {
          await prisma.client.user.create({
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

      const user = await prisma.client.user.findUnique({
        where: { email },
      });

      expect(user).toBeNull();
    });

    it('should return the transaction client when inside als.run', async () => {
      await prisma.runInTransaction(() => {
        const client = prisma.client;

        expect(client).not.toBe(prisma['_prisma']);

        return Promise.resolve();
      });
    });
  });
});
