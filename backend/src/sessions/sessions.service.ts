import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { ChatService } from '../chat/chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';

const sessionInclude = {
  createdBy: { select: { username: true } },
  stakes: { include: { user: { select: { id: true, nom: true, username: true, couleur: true } } } },
} satisfies Prisma.SessionInclude;

type SessionWithStakes = Prisma.SessionGetPayload<{ include: typeof sessionInclude }>;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly chat: ChatService,
  ) {}

  async list(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { statut: 'open' },
      include: sessionInclude,
      orderBy: { drawAt: 'asc' },
    });
    return sessions.map((s) => this.toView(s, userId));
  }

  async get(id: string, userId: string) {
    const session = await this.prisma.session.findUnique({ where: { id }, include: sessionInclude });
    if (!session) {
      throw new NotFoundException('Session introuvable');
    }
    return this.toView(session, userId);
  }

  async create(userId: string, input: { titre: string; miseMin: number }) {
    const serverSeed = randomBytes(32).toString('hex');
    const serverSeedHash = createHash('sha256').update(serverSeed).digest('hex');
    const session = await this.prisma.session.create({
      data: {
        titre: input.titre.trim(),
        miseMin: input.miseMin,
        drawAt: this.nextMidnight(),
        createdById: userId,
        serverSeed,
        serverSeedHash,
      },
      include: sessionInclude,
    });
    await this.chat.createSessionConversation(session.id, session.titre, userId);
    return this.toView(session, userId);
  }

  async stake(userId: string, sessionId: string, montant: number) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Session introuvable');
    }
    if (session.statut !== 'open') {
      throw new ForbiddenException('Cette session est fermée');
    }
    if (montant < session.miseMin) {
      throw new BadRequestException(`Mise minimale : ${session.miseMin} F`);
    }

    // Debit the wallet, record the stake, and grow the pot — all atomically.
    await this.prisma.$transaction(async (tx) => {
      await this.wallet.applyInTx(tx, userId, -montant, 'mise', {
        ref: `Mise — ${session.titre}`,
        sessionId: session.id,
      });
      await tx.stake.create({ data: { sessionId, userId, montant } });
      await tx.session.update({
        where: { id: sessionId },
        data: { potTotal: { increment: montant } },
      });
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.chat.ensureSessionParticipant(sessionId, userId);
    await this.chat.addSystemMessage(
      sessionId,
      `${user?.nom ?? 'Un joueur'} a misé ${montant.toLocaleString('fr-FR')} F`,
    );
    return this.get(sessionId, userId);
  }

  private toView(s: SessionWithStakes, userId: string) {
    const byUser = new Map<string, { nom: string; username: string; couleur: string; montant: number; id: string }>();
    for (const stake of s.stakes) {
      const cur = byUser.get(stake.userId) ?? {
        id: stake.user.id,
        nom: stake.user.nom,
        username: stake.user.username,
        couleur: stake.user.couleur,
        montant: 0,
      };
      cur.montant += stake.montant;
      byUser.set(stake.userId, cur);
    }
    const participants = [...byUser.values()].map((p) => ({
      username: p.username,
      nom: p.nom,
      couleur: p.couleur,
      montant: p.montant,
      moi: p.id === userId,
    }));
    return {
      id: s.id,
      titre: s.titre,
      miseMin: s.miseMin,
      potTotal: s.potTotal,
      joueurs: byUser.size,
      statut: s.statut,
      drawAt: s.drawAt.toISOString(),
      createdParUsername: s.createdBy.username,
      serverSeedHash: s.serverSeedHash,
      participants,
      maMise: byUser.get(userId)?.montant ?? 0,
    };
  }

  private nextMidnight(): Date {
    const d = new Date();
    d.setHours(24, 0, 0, 0);
    return d;
  }
}
