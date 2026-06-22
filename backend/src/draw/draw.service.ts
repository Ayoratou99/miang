import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { CHANNEL_SOCKET, roomSession } from '../common/constants';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WalletService } from '../wallet/wallet.service';

interface DrawOutcome {
  sessionId: string;
  titre: string;
  winnerId: string;
  gagnantUsername: string;
  gagnantNom: string;
  montant: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

@Injectable()
export class DrawService {
  private readonly logger = new Logger('Draw');

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  /** All open sessions whose draw time has passed (the worker sweeps these). */
  async dueSessionIds(): Promise<string[]> {
    const rows = await this.prisma.session.findMany({
      where: { statut: 'open', drawAt: { lte: new Date() } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async manualRun(userId: string, sessionId: string): Promise<DrawOutcome | null> {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundException('Session introuvable');
    }
    if (session.createdById !== userId) {
      throw new ForbiddenException('Seul le créateur peut lancer le tirage manuellement.');
    }
    return this.runDrawForSession(sessionId);
  }

  /**
   * Provably-fair, server-side, idempotent. The winner is weighted by total stake
   * (each FCFA = one ticket). Payout is atomic; the result is persisted with the
   * revealed server seed so anyone can verify hash(seed) == published commitment.
   */
  async runDrawForSession(sessionId: string): Promise<DrawOutcome | null> {
    const outcome = await this.prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: sessionId },
        include: {
          drawResult: true,
          stakes: { include: { user: { select: { id: true, nom: true, username: true } } } },
        },
      });
      if (!session || session.drawResult || session.statut === 'drawn') {
        return null; // already drawn — idempotent
      }
      await tx.session.update({ where: { id: sessionId }, data: { statut: 'locked' } });

      if (session.stakes.length === 0 || session.potTotal <= 0) {
        await tx.session.update({ where: { id: sessionId }, data: { statut: 'drawn' } });
        return null;
      }

      // Aggregate tickets per user.
      const totals = new Map<string, { nom: string; username: string; montant: number }>();
      for (const s of session.stakes) {
        const e = totals.get(s.userId) ?? { nom: s.user.nom, username: s.user.username, montant: 0 };
        e.montant += s.montant;
        totals.set(s.userId, e);
      }

      const clientSeed = session.id;
      const nonce = 0;
      const hash = createHash('sha256')
        .update(`${session.serverSeed}:${clientSeed}:${nonce}`)
        .digest('hex');
      const ticket = Number(BigInt(`0x${hash.slice(0, 13)}`) % BigInt(session.potTotal));

      let acc = 0;
      let winnerId = '';
      let winner = { nom: '', username: '' };
      for (const [uid, e] of totals) {
        acc += e.montant;
        if (ticket < acc) {
          winnerId = uid;
          winner = e;
          break;
        }
      }

      await this.wallet.applyInTx(tx, winnerId, session.potTotal, 'gain', {
        ref: `Gain — ${session.titre}`,
        sessionId,
      });
      await tx.drawResult.create({
        data: {
          sessionId,
          winnerId,
          montant: session.potTotal,
          serverSeedHash: session.serverSeedHash,
          serverSeed: session.serverSeed,
          clientSeed,
          nonce,
        },
      });
      await tx.session.update({ where: { id: sessionId }, data: { statut: 'drawn' } });

      // System line in the session chat (history).
      const conv = await tx.conversation.findUnique({ where: { sessionId } });
      if (conv) {
        await tx.message.create({
          data: {
            conversationId: conv.id,
            authorId: null,
            type: 'system',
            corps: `🏆 @${winner.username} rafle ${session.potTotal.toLocaleString('fr-FR')} F`,
          },
        });
      }

      return {
        sessionId,
        titre: session.titre,
        winnerId,
        gagnantUsername: winner.username,
        gagnantNom: winner.nom,
        montant: session.potTotal,
        serverSeed: session.serverSeed,
        serverSeedHash: session.serverSeedHash,
        clientSeed,
        nonce,
      } satisfies DrawOutcome;
    });

    if (outcome) {
      this.broadcast(outcome);
      await this.notifications.notify(outcome.winnerId, {
        type: 'draw',
        titre: '🏆 Tu as gagné !',
        corps: `Tu rafles ${outcome.montant.toLocaleString('fr-FR')} F — ${outcome.titre}`,
        url: `/sessions/${outcome.sessionId}`,
        tag: 'draw',
      });
      this.logger.log(`Tirage ${outcome.sessionId} → @${outcome.gagnantUsername} (${outcome.montant} F)`);
    }
    return outcome;
  }

  async getResult(sessionId: string) {
    const r = await this.prisma.drawResult.findUnique({
      where: { sessionId },
      include: { winner: { select: { nom: true, username: true } } },
    });
    if (!r) {
      return null;
    }
    return {
      sessionId: r.sessionId,
      gagnantUsername: r.winner.username,
      gagnantNom: r.winner.nom,
      montant: r.montant,
      serverSeedHash: r.serverSeedHash,
      serverSeed: r.serverSeed,
      clientSeed: r.clientSeed,
      nonce: r.nonce,
      tireLe: r.drawnAt.toISOString(),
    };
  }

  private broadcast(o: DrawOutcome): void {
    void this.redis.publish(
      CHANNEL_SOCKET,
      JSON.stringify({
        room: roomSession(o.sessionId),
        event: 'draw:winner',
        data: {
          sessionId: o.sessionId,
          gagnantUsername: o.gagnantUsername,
          gagnantNom: o.gagnantNom,
          montant: o.montant,
          serverSeedHash: o.serverSeedHash,
          serverSeed: o.serverSeed,
          clientSeed: o.clientSeed,
          nonce: o.nonce,
        },
      }),
    );
  }
}
