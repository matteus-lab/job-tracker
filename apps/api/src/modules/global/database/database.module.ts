import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaAdapter } from './infra/prisma.adapter';
import { ITRANSACTION_MANAGER_TOKEN } from 'src/modules/global/database/domain/transaction-manager.interface';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PrismaAdapter,
    {
      provide: ITRANSACTION_MANAGER_TOKEN,
      useExisting: PrismaAdapter,
    },
  ],
  exports: [PrismaAdapter, ITRANSACTION_MANAGER_TOKEN],
})
export class DatabaseModule {}
