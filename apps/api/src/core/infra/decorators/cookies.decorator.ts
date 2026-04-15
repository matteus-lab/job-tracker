import { Request } from 'express';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Cookies = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();

    return data
      ? (request.cookies?.[data] as string | undefined)
      : request.cookies;
  },
);
