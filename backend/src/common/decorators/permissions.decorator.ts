import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'requiredPermissions';

/** Require one or more RBAC permission codes (e.g. 'wallet:withdraw'). */
export const RequirePermission = (...codes: string[]) => SetMetadata(PERMISSIONS_KEY, codes);
