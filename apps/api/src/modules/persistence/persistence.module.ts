import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaAdapter } from './infra/prisma.adapter';
import { PERSISTENCE_PORT_TOKEN } from 'src/modules/persistence/domain/persistence.port';

@Module({
  imports: [ConfigModule],
  providers: [
    PrismaAdapter,
    {
      provide: PERSISTENCE_PORT_TOKEN,
      useExisting: PrismaAdapter,
    },
  ],
  exports: [PERSISTENCE_PORT_TOKEN],
})
export class PersistenceModule {}
