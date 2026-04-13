import { Module } from '@nestjs/common';
import { USER_REPOSITORY_PORT_TOKEN } from './domain/user.repository.port';
import { UserService } from './engine/user.service';
import { UserRepository } from './infra/user.repository';
import { HashingModule } from '../hashing/hashing.module';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [HashingModule, PersistenceModule],
  providers: [
    UserService,
    {
      provide: USER_REPOSITORY_PORT_TOKEN,
      useClass: UserRepository,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
