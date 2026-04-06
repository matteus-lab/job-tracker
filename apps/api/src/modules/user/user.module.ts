import { Module } from '@nestjs/common';
import { UserService } from './user.service';

import { IUSER_REPOSITORY_TOKEN } from './user.repository.interface';
import { UserRepository } from './user.repository';

@Module({
  providers: [
    UserService,
    {
      provide: IUSER_REPOSITORY_TOKEN,
      useClass: UserRepository,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
