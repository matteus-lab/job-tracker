import { Module } from '@nestjs/common';
import { IUSER_REPOSITORY_TOKEN } from './domain/user.repository.interface';
import { UserService } from './engine/user.service';
import { UserRepository } from './infra/user.repository';

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
