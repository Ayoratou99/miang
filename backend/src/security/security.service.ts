import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES } from '../common/constants';

@Injectable()
export class SecurityService {
  constructor(private readonly prisma: PrismaService) {}

  /** All permission codes granted to a user through their roles. */
  async permissionsOf(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      select: { role: { select: { permissions: { select: { permission: { select: { code: true } } } } } } },
    });
    const codes = new Set<string>();
    for (const r of rows) {
      for (const rp of r.role.permissions) {
        codes.add(rp.permission.code);
      }
    }
    return codes;
  }

  /** True only if the user holds EVERY required permission code. */
  async userHasPermissions(userId: string, required: string[]): Promise<boolean> {
    const codes = await this.permissionsOf(userId);
    return required.every((c) => codes.has(c));
  }

  async assignRole(userId: string, roleCode: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) {
      return; // roles are seeded; silently ignore unknown codes
    }
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      create: { userId, roleId: role.id },
      update: {},
    });
  }

  /** Every new account gets the `player` role. */
  async ensureDefaultRole(userId: string): Promise<void> {
    await this.assignRole(userId, ROLES.PLAYER);
  }
}
