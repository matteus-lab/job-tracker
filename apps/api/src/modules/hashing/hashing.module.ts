import { Module } from '@nestjs/common';

import { HashingAdapter } from './infra/hashing.adapter';
import { HASHING_PORT_TOKEN } from './domain/hashing.port';

@Module({
  providers: [
    {
      provide: HASHING_PORT_TOKEN,
      useClass: HashingAdapter,
    },
  ],
  exports: [HASHING_PORT_TOKEN],
})
export class HashingModule {}
