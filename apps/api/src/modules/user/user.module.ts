import { Module } from '@nestjs/common';
import { IUSER_REPOSITORY_TOKEN } from './domain/user.repository.interface';
import { UserService } from './engine/user.service';
import { UserRepository } from './infra/user.repository';
import { HashingModule } from '../hashing/hashing.module';

@Module({
  imports: [HashingModule],
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
