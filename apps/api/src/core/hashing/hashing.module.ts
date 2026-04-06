import { Global, Module } from '@nestjs/common';

import { HashingService } from './hashing.service';
import { IHASHING_SERVICE_TOKEN } from './hashing.service.interface';

@Global()
@Module({
  providers: [
    {
      provide: IHASHING_SERVICE_TOKEN,
      useClass: HashingService,
    },
  ],
  exports: [IHASHING_SERVICE_TOKEN],
})
export class HashingModule {}
