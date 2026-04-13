import { Module } from '@nestjs/common';

import { HashingService } from './infra/hashing.adapter';
import { IHASHING_SERVICE_TOKEN } from './domain/hashing.service.interface';

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
