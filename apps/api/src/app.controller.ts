import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

import { Expose } from 'class-transformer';
import { Public } from 'src/core/decorators/public.decorator';

class HealthResponseDto {
  @Expose()
  status: string;

  constructor(dto: HealthResponseDto) {
    Object.assign(this, dto);
  }
}

@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness check.' })
  @ApiOkResponse({
    description: 'Health check passed',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          default: 'ok',
        },
      },
    },
  })
  getHealth(): HealthResponseDto {
    return new HealthResponseDto({ status: 'ok' });
  }
}
