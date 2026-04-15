import { Module } from '@nestjs/common';
import { AuthController } from './infra/auth.controller';
import { AuthService } from './application/auth.service';
import { UserModule } from 'src/modules/user/user.module';
import { SessionModule } from 'src/modules/session/session.module';
import { HashingModule } from '../hashing/hashing.module';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [PersistenceModule, HashingModule, UserModule, SessionModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
