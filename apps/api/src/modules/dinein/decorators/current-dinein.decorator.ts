import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentDineIn = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
        const req = ctx.switchToHttp().getRequest();
        return req.dineIn ?? null;
    },
);