import { Module } from '@nestjs/common';
import { SessionService } from './session.service';

import { ISESSION_REPOSITORY_TOKEN } from './session.repository.interface';
import { SessionRepository } from './session.repository';

@Module({
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
