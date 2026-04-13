import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaAdapter } from './infra/prisma.adapter';
import { DATABASE_PORT_TOKEN } from 'src/modules/global/database/domain/database.port';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PrismaAdapter,
    {
      provide: DATABASE_PORT_TOKEN,
      useExisting: PrismaAdapter,
    },
  ],
  exports: [PrismaAdapter, DATABASE_PORT_TOKEN],
})
export class DatabaseModule {}
