import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Prisma } from '@generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'async_hooks';
import { ITransactionManager } from '../transaction-manager.interface';

@Injectable()
export class PrismaService
  implements OnModuleInit, OnModuleDestroy, ITransactionManager
{
  private readonly _prisma: PrismaClient;
  private readonly als = new AsyncLocalStorage<Prisma.TransactionClient>();

  /* v8 ignore start */
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
  /* v8 ignore stop */

  get client(): Prisma.TransactionClient {
    const tx = this.als.getStore();

    if (tx) return tx;
    return this._prisma;
  }

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return await this._prisma.$transaction(async (tx) => {
      return await this.als.run(tx, work);
    });
  }
}
