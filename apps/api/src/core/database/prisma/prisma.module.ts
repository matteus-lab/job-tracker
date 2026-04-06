import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { ITRANSACTION_MANAGER_TOKEN } from '../transaction-manager.interface';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    {
      provide: ITRANSACTION_MANAGER_TOKEN,
      useExisting: PrismaService,
    },
  ],
  exports: [PrismaService, ITRANSACTION_MANAGER_TOKEN],
})
export class PrismaModule {}
