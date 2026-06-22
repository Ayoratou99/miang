import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from '../presence/presence.service';

const sel = { id: true, nom: true, username: true, couleur: true };

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
  ) {}

  async amis(userId: string) {
    const fs = await this.prisma.friendship.findMany({
      where: { statut: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: { requester: { select: sel }, addressee: { select: sel } },
    });
    const others = fs.map((f) => (f.requesterId === userId ? f.addressee : f.requester));
    const online = await this.presence.whoIsOnline(others.map((u) => u.id));
    return others.map((u) => ({
      id: u.id,
      nom: u.nom,
      username: u.username,
      couleur: u.couleur,
      enLigne: online[u.id] ?? false,
    }));
  }

  async demandes(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: { addresseeId: userId, statut: 'pending' },
      include: { requester: { select: sel } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      nom: r.requester.nom,
      username: r.requester.username,
      couleur: r.requester.couleur,
    }));
  }

  async request(userId: string, username: string) {
    const target = await this.prisma.user.findUnique({ where: { username: username.replace(/^@/, '').toLowerCase() } });
    if (!target) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    if (target.id === userId) {
      throw new BadRequestException('Tu ne peux pas t’ajouter toi-même');
    }
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: target.id },
          { requesterId: target.id, addresseeId: userId },
        ],
      },
    });
    if (existing) {
      return { id: existing.id, statut: existing.statut };
    }
    const created = await this.prisma.friendship.create({
      data: { requesterId: userId, addresseeId: target.id, statut: 'pending' },
    });
    return { id: created.id, statut: created.statut };
  }

  async accept(userId: string, id: string) {
    const f = await this.prisma.friendship.findUnique({ where: { id } });
    if (!f || f.addresseeId !== userId) {
      throw new ForbiddenException('Demande introuvable');
    }
    await this.prisma.friendship.update({ where: { id }, data: { statut: 'accepted' } });
    return { ok: true };
  }

  async decline(userId: string, id: string) {
    const f = await this.prisma.friendship.findUnique({ where: { id } });
    if (!f || f.addresseeId !== userId) {
      throw new ForbiddenException('Demande introuvable');
    }
    await this.prisma.friendship.update({ where: { id }, data: { statut: 'declined' } });
    return { ok: true };
  }
}
