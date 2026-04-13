import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Prisma } from '@generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'async_hooks';
import { PersistencePort } from 'src/modules/persistence/domain/persistence.port';

@Injectable()
export class PrismaAdapter
  implements OnModuleInit, OnModuleDestroy, PersistencePort
{
  private readonly _prisma: PrismaClient;
  private readonly als = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(private readonly configService: ConfigService) {
    const url = configService.getOrThrow<string>('DATABASE_URL');
    const schema = configService.getOrThrow<string>('DATABASE_SCHEMA');

    const adapter = new PrismaPg({ connectionString: url }, { schema: schema });

    this._prisma = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    await this._prisma.$connect();
  }

  async onModuleDestroy() {
    await this._prisma.$disconnect();
  }

  get client(): Prisma.TransactionClient {
    return this.als.getStore() || this._prisma;
  }

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return await this._prisma.$transaction(async (tx) => {
      return await this.als.run(tx, work);
    });
  }
}
