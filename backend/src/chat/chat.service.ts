import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Conversation, Message } from '@prisma/client';
import { CHANNEL_SOCKET, roomSession } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const PALETTE = ['forest', 'em', 'gold', 'coral'];
function couleurFromString(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length]!;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ── session plumbing (called by SessionsService) ──────────────────
  async createSessionConversation(sessionId: string, titre: string, creatorId: string) {
    const conv = await this.prisma.conversation.create({
      data: {
        type: 'session',
        titre,
        sessionId,
        participants: { create: { userId: creatorId } },
      },
    });
    return conv;
  }

  async ensureSessionParticipant(sessionId: string, userId: string): Promise<void> {
    const conv = await this.prisma.conversation.findUnique({ where: { sessionId } });
    if (!conv) {
      return;
    }
    await this.prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: conv.id, userId } },
      create: { conversationId: conv.id, userId },
      update: {},
    });
  }

  async addSystemMessage(sessionId: string, corps: string): Promise<void> {
    const conv = await this.prisma.conversation.findUnique({ where: { sessionId } });
    if (!conv) {
      return;
    }
    const message = await this.prisma.message.create({
      data: { conversationId: conv.id, authorId: null, type: 'system', corps },
    });
    this.emitToRoom(roomSession(sessionId), 'chat:message', this.toMessageView(message, null, null));
  }

  // ── REST history / send ───────────────────────────────────────────
  async list(userId: string) {
    const convs = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: { select: { id: true, nom: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { author: { select: { nom: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const views = [];
    for (const c of convs) {
      const me = c.participants.find((p) => p.userId === userId);
      const nonLus = await this.prisma.message.count({
        where: {
          conversationId: c.id,
          authorId: { not: userId },
          ...(me?.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
        },
      });
      const last = c.messages[0];
      const autre = c.participants.find((p) => p.userId !== userId)?.user;
      const titre = c.type === 'prive' ? (autre?.nom ?? 'Privé') : (c.titre ?? 'Session');
      views.push({
        id: c.id,
        type: c.type,
        titre,
        couleur: couleurFromString(titre),
        dernierMessage: last
          ? last.type === 'system'
            ? last.corps
            : `${last.author?.nom ?? '—'} : ${last.corps}`
          : '',
        dernierLe: last ? this.hhmm(last.createdAt) : '',
        nonLus,
        sessionId: c.sessionId ?? undefined,
      });
    }
    return views;
  }

  async messages(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: { author: { select: { id: true, nom: true, username: true, couleur: true } } },
    });
    await this.markRead(conversationId, userId);
    return messages.map((m) => this.toMessageView(m, m.author, userId));
  }

  async send(conversationId: string, userId: string, corps: string) {
    await this.assertMember(conversationId, userId);
    const message = await this.prisma.message.create({
      data: { conversationId, authorId: userId, type: 'text', corps },
      include: { author: { select: { id: true, nom: true, username: true, couleur: true } } },
    });
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    const room = conv?.sessionId ? roomSession(conv.sessionId) : `conv:${conversationId}`;
    this.emitToRoom(room, 'chat:message', this.toMessageView(message, message.author, null));
    return this.toMessageView(message, message.author, userId);
  }

  async markRead(conversationId: string, userId: string): Promise<void> {
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
  }

  /** Publish a socket event via Redis (the gateway re-emits; works across instances + worker). */
  emitToRoom(room: string, event: string, data: unknown): void {
    void this.redis.publish(CHANNEL_SOCKET, JSON.stringify({ room, event, data }));
  }

  // ── helpers ────────────────────────────────────────────────────────
  private async assertMember(conversationId: string, userId: string): Promise<void> {
    const conv = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) {
      throw new NotFoundException('Conversation introuvable');
    }
    const member = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('Tu ne participes pas à cette conversation');
    }
  }

  private toMessageView(
    m: Message,
    author: { id: string; nom: string; username: string; couleur: string } | null,
    viewerId: string | null,
  ) {
    return {
      id: m.id,
      conversationId: m.conversationId,
      auteurUsername: author?.username ?? null,
      auteurNom: author?.nom,
      auteurCouleur: author?.couleur,
      corps: m.corps,
      type: m.type,
      le: this.hhmm(m.createdAt),
      moi: !!author && !!viewerId && author.id === viewerId,
    };
  }

  private hhmm(d: Date): string {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}
