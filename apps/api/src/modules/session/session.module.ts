import { Module } from '@nestjs/common';

import { SESSION_REPOSITORY_PORT_TOKEN } from './domain/session.repository.port';
import { SessionService } from './engine/session.service';
import { SessionRepository } from './infra/session.repository';
import { HashingModule } from '../hashing/hashing.module';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [HashingModule, PersistenceModule],
  providers: [
    SessionService,
    {
      provide: SESSION_REPOSITORY_PORT_TOKEN,
      useClass: SessionRepository,
    },
  ],
  exports: [SessionService],
})
export class SessionModule {}
