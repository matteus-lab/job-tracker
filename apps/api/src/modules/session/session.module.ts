import { Module } from '@nestjs/common';

import { ISESSION_REPOSITORY_TOKEN } from './domain/session.repository.interface';
import { SessionService } from './engine/session.service';
import { SessionRepository } from './infra/session.repository';
import { HashingModule } from '../hashing/hashing.module';

@Module({
  imports: [HashingModule],
  providers: [
    SessionService,
    {
      provide: ISESSION_REPOSITORY_TOKEN,
      useClass: SessionRepository,
    },
  ],
  exports: [SessionService],
})
export class SessionModule {}
