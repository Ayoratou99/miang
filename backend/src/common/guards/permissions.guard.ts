import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityService } from '../../security/security.service';
import { AuthUser } from '../types/auth-user';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/** Enforces @RequirePermission(...) codes via the RBAC tables. Authn runs first. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly security: SecurityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const userId = request.user?.id;
    if (!userId) {
      throw new ForbiddenException('Authentification requise');
    }
    const ok = await this.security.userHasPermissions(userId, required);
    if (!ok) {
      throw new ForbiddenException('Permission insuffisante');
    }
    return true;
  }
}
