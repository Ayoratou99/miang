import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthUser } from '../types/auth-user';

/** Inject the authenticated principal, or one of its fields: @CurrentUser('id'). */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      return undefined;
    }
    return data ? user[data] : user;
  },
);
