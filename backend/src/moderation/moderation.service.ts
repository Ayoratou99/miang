import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async report(reporterId: string, input: { cibleUserId?: string; cibleMessageId?: string; motif: string }) {
    await this.prisma.auditLog.create({
      data: {
        actorId: reporterId,
        action: 'report',
        cible: input.cibleUserId ?? input.cibleMessageId ?? null,
        meta: { motif: input.motif, type: input.cibleMessageId ? 'message' : 'user' } as never,
      },
    });
    return { ok: true };
  }

  listReports() {
    return this.prisma.auditLog.findMany({
      where: { action: 'report' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async ban(adminId: string, userId: string, reason: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { banni: true } });
    await this.prisma.auditLog.create({
      data: { actorId: adminId, action: 'ban', cible: userId, meta: { reason } as never },
    });
    // Revoke all sessions so the ban takes effect immediately.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async unban(adminId: string, userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { banni: false } });
    await this.prisma.auditLog.create({
      data: { actorId: adminId, action: 'unban', cible: userId },
    });
    return { ok: true };
  }
}
